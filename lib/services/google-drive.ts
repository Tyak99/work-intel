import { getServiceSupabase, GoogleDriveGrantRow, DriveFolderRow } from '../supabase';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';

// Scopes for Google Drive - read-only access to files and metadata
const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

export interface GoogleDriveGrant {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  scopes: string[];
}

export interface DriveFolder {
  id: string;
  folderId: string;
  folderName: string;
  purpose: string | null;
  enabled: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  size?: string;
}

export interface DriveFileContent {
  file: DriveFile;
  content: string;
}

function getClientId(): string {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_DRIVE_CLIENT_ID is not configured');
  }
  return clientId;
}

function getClientSecret(): string {
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error('GOOGLE_DRIVE_CLIENT_SECRET is not configured');
  }
  return clientSecret;
}

function getRedirectUri(): string {
  return process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3004/api/auth/google-drive/callback';
}

/**
 * Generate a random state token for CSRF protection
 */
export async function createOAuthState(userId: string): Promise<string> {
  const stateToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  const { error } = await getServiceSupabase()
    .from('drive_oauth_states')
    .insert({
      user_id: userId,
      state_token: stateToken,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('[GoogleDrive] Error creating OAuth state:', error);
    throw error;
  }

  return stateToken;
}

/**
 * Verify and consume a state token, returning the associated userId
 */
export async function verifyOAuthState(stateToken: string): Promise<string | null> {
  const { data, error } = await getServiceSupabase()
    .from('drive_oauth_states')
    .select('user_id, expires_at')
    .eq('state_token', stateToken)
    .single();

  if (error || !data) {
    console.error('[GoogleDrive] Invalid OAuth state token');
    return null;
  }

  // Delete the token (one-time use)
  await getServiceSupabase()
    .from('drive_oauth_states')
    .delete()
    .eq('state_token', stateToken);

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    console.error('[GoogleDrive] OAuth state token expired');
    return null;
  }

  return data.user_id;
}

/**
 * Build the Google OAuth authorization URL
 */
export async function buildDriveAuthUrl(userId: string): Promise<string> {
  const stateToken = await createOAuthState(userId);

  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: DRIVE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // Force consent to get refresh token
    state: stateToken,
  });

  return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string, userId: string): Promise<GoogleDriveGrant> {
  console.log('[GoogleDrive] Exchanging code for tokens');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      grant_type: 'authorization_code',
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[GoogleDrive] Token exchange failed:', error);
    throw new Error(`Failed to exchange code: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Get user email from Google
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${data.access_token}`,
    },
  });

  if (!userInfoResponse.ok) {
    throw new Error('Failed to fetch user info');
  }

  const userInfo = await userInfoResponse.json();

  const grant: GoogleDriveGrant = {
    userId,
    email: userInfo.email,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    scopes: DRIVE_SCOPES,
  };

  // Save to database
  await saveGrant(grant);

  return grant;
}

/**
 * Refresh the access token if expired
 */
export async function refreshAccessToken(grant: GoogleDriveGrant): Promise<GoogleDriveGrant> {
  console.log('[GoogleDrive] Refreshing access token');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: grant.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[GoogleDrive] Token refresh failed:', error);
    throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  const updatedGrant: GoogleDriveGrant = {
    ...grant,
    accessToken: data.access_token,
    tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
  };

  // Update in database
  await saveGrant(updatedGrant);

  return updatedGrant;
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const grant = await getUserDriveGrant(userId);
  if (!grant) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired = new Date(grant.tokenExpiry).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    try {
      const refreshedGrant = await refreshAccessToken(grant);
      return refreshedGrant.accessToken;
    } catch (error) {
      console.error('[GoogleDrive] Failed to refresh token:', error);
      return null;
    }
  }

  return grant.accessToken;
}

/**
 * Save grant to database
 */
async function saveGrant(grant: GoogleDriveGrant): Promise<void> {
  const { error } = await getServiceSupabase()
    .from('google_drive_grants')
    .upsert({
      user_id: grant.userId,
      email: grant.email,
      access_token: grant.accessToken,
      refresh_token: grant.refreshToken,
      token_expiry: grant.tokenExpiry.toISOString(),
      scopes: grant.scopes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('[GoogleDrive] Error saving grant:', error);
    throw error;
  }
}

/**
 * Get user's Drive grant from database
 */
export async function getUserDriveGrant(userId: string): Promise<GoogleDriveGrant | null> {
  const { data, error } = await getServiceSupabase()
    .from('google_drive_grants')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No grant found
    }
    console.error('[GoogleDrive] Error fetching grant:', error);
    return null;
  }

  return {
    userId: data.user_id,
    email: data.email,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: new Date(data.token_expiry),
    scopes: data.scopes,
  };
}

/**
 * Revoke and delete user's Drive grant
 */
export async function revokeDriveGrant(userId: string): Promise<void> {
  const grant = await getUserDriveGrant(userId);
  if (!grant) {
    return;
  }

  try {
    // Revoke token at Google
    await fetch(`https://oauth2.googleapis.com/revoke?token=${grant.accessToken}`, {
      method: 'POST',
    });
  } catch (error) {
    console.error('[GoogleDrive] Error revoking token:', error);
    // Continue to delete from database anyway
  }

  // Delete grant from database
  const { error } = await getServiceSupabase()
    .from('google_drive_grants')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[GoogleDrive] Error deleting grant:', error);
    throw error;
  }

  // Also delete all watched folders
  await getServiceSupabase()
    .from('drive_folders')
    .delete()
    .eq('user_id', userId);
}

/**
 * Test if the Drive connection is valid
 */
export async function testDriveConnection(userId: string): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return false;
    }

    // Try to fetch the root folder
    const response = await fetch(`${GOOGLE_DRIVE_API}/files?pageSize=1`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[GoogleDrive] Connection test failed:', error);
    return false;
  }
}

// ============= Folder Management =============

/**
 * Validate a Drive file/folder ID to prevent query injection.
 * Drive IDs are alphanumeric with hyphens and underscores.
 */
function sanitizeDriveId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`Invalid Drive ID: ${id}`);
  }
  return id;
}

/**
 * List all folders the user can access (for folder picker)
 */
export async function listAvailableFolders(userId: string, parentId?: string): Promise<DriveFile[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error('Not authenticated with Google Drive');
  }

  const safeParentId = parentId ? sanitizeDriveId(parentId) : null;
  const query = safeParentId
    ? `'${safeParentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `'root' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const params = new URLSearchParams({
    q: query,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
    orderBy: 'name',
    pageSize: '100',
  });

  const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list folders: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Get user's watched folders from database
 */
export async function getWatchedFolders(userId: string): Promise<DriveFolder[]> {
  const { data, error } = await getServiceSupabase()
    .from('drive_folders')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (error) {
    console.error('[GoogleDrive] Error fetching folders:', error);
    return [];
  }

  return (data || []).map((row: DriveFolderRow) => ({
    id: row.id,
    folderId: row.folder_id,
    folderName: row.folder_name,
    purpose: row.purpose,
    enabled: row.enabled,
  }));
}

/**
 * Add a folder to watch
 */
export async function addWatchedFolder(
  userId: string,
  folderId: string,
  folderName: string,
  purpose?: string
): Promise<DriveFolder> {
  const { data, error } = await getServiceSupabase()
    .from('drive_folders')
    .upsert({
      user_id: userId,
      folder_id: folderId,
      folder_name: folderName,
      purpose: purpose || null,
      enabled: true,
    }, {
      onConflict: 'user_id,folder_id',
    })
    .select()
    .single();

  if (error) {
    console.error('[GoogleDrive] Error adding folder:', error);
    throw error;
  }

  return {
    id: data.id,
    folderId: data.folder_id,
    folderName: data.folder_name,
    purpose: data.purpose,
    enabled: data.enabled,
  };
}

/**
 * Remove a watched folder
 */
export async function removeWatchedFolder(userId: string, folderId: string): Promise<void> {
  const { error } = await getServiceSupabase()
    .from('drive_folders')
    .delete()
    .eq('user_id', userId)
    .eq('folder_id', folderId);

  if (error) {
    console.error('[GoogleDrive] Error removing folder:', error);
    throw error;
  }
}

// ============= File Content Fetching =============

/**
 * List files in a folder (recently modified)
 */
export async function listFilesInFolder(
  userId: string,
  folderId: string,
  options: { limit?: number; modifiedAfter?: Date } = {}
): Promise<DriveFile[]> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error('Not authenticated with Google Drive');
  }

  const { limit = 20, modifiedAfter } = options;

  const safeFolderId = sanitizeDriveId(folderId);
  let query = `'${safeFolderId}' in parents and trashed = false`;

  // Only include readable file types
  const readableTypes = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'text/plain',
    'text/markdown',
    'application/pdf',
  ];
  query += ` and (${readableTypes.map(t => `mimeType = '${t}'`).join(' or ')})`;

  if (modifiedAfter) {
    query += ` and modifiedTime > '${modifiedAfter.toISOString()}'`;
  }

  const params = new URLSearchParams({
    q: query,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, size)',
    orderBy: 'modifiedTime desc',
    pageSize: String(limit),
  });

  const response = await fetch(`${GOOGLE_DRIVE_API}/files?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to list files: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Get the content of a file
 */
export async function getFileContent(userId: string, file: DriveFile): Promise<string> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    throw new Error('Not authenticated with Google Drive');
  }

  let url: string;
  let headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Google Docs need to be exported
  if (file.mimeType === 'application/vnd.google-apps.document') {
    url = `${GOOGLE_DRIVE_API}/files/${file.id}/export?mimeType=text/plain`;
  } else if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
    url = `${GOOGLE_DRIVE_API}/files/${file.id}/export?mimeType=text/csv`;
  } else {
    // Regular files can be downloaded directly
    url = `${GOOGLE_DRIVE_API}/files/${file.id}?alt=media`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[GoogleDrive] Failed to get file content for ${file.name}:`, error);
    return `[Error reading file: ${file.name}]`;
  }

  const content = await response.text();

  // Truncate very large files
  const maxLength = 50000; // ~50KB
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + '\n\n[Content truncated...]';
  }

  return content;
}

/**
 * Fetch all content from watched folders
 */
export async function fetchAllWatchedContent(
  userId: string,
  options: { modifiedAfter?: Date; maxFilesPerFolder?: number } = {}
): Promise<{ folder: DriveFolder; files: DriveFileContent[] }[]> {
  const folders = await getWatchedFolders(userId);
  if (folders.length === 0) {
    return [];
  }

  const { modifiedAfter, maxFilesPerFolder = 10 } = options;

  const results = await Promise.all(
    folders.map(async (folder) => {
      try {
        const files = await listFilesInFolder(userId, folder.folderId, {
          limit: maxFilesPerFolder,
          modifiedAfter,
        });

        const filesWithContent = await Promise.all(
          files.map(async (file) => {
            const content = await getFileContent(userId, file);
            return { file, content };
          })
        );

        return { folder, files: filesWithContent };
      } catch (error) {
        console.error(`[GoogleDrive] Error fetching folder ${folder.folderName}:`, error);
        return { folder, files: [] };
      }
    })
  );

  return results;
}
