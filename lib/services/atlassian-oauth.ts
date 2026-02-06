import { getServiceSupabase, JiraIntegrationConfig } from '../supabase';
import { encrypt, decrypt } from '../utils/encryption';

const ATLASSIAN_AUTH_URL = 'https://auth.atlassian.com/authorize';
const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const ATLASSIAN_API_URL = 'https://api.atlassian.com';

// Classic scopes for Jira access
// read:jira-work covers issues, projects, boards, sprints (including agile API)
// read:jira-user covers user profiles and avatars
const JIRA_SCOPES = [
  'read:jira-work',
  'read:jira-user',
  'offline_access', // For refresh tokens
];

export interface AtlassianGrant {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  scopes: string[];
  email?: string;
}

export interface AtlassianSite {
  id: string;
  url: string;
  name: string;
  scopes: string[];
  avatarUrl?: string;
}

function getClientId(): string {
  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  if (!clientId) {
    throw new Error('ATLASSIAN_CLIENT_ID is not configured');
  }
  return clientId;
}

function getClientSecret(): string {
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error('ATLASSIAN_CLIENT_SECRET is not configured');
  }
  return clientSecret;
}

function getRedirectUri(): string {
  return process.env.ATLASSIAN_REDIRECT_URI || 'http://localhost:3004/api/auth/atlassian/callback';
}

/**
 * Generate a random state token for CSRF protection
 */
export async function createOAuthState(teamId: string, userId: string): Promise<string> {
  const stateToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  const { error } = await getServiceSupabase()
    .from('atlassian_oauth_states')
    .insert({
      team_id: teamId,
      user_id: userId,
      state_token: stateToken,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('[Atlassian] Error creating OAuth state:', error);
    throw error;
  }

  return stateToken;
}

/**
 * Verify and consume a state token, returning the associated teamId and userId
 */
export async function verifyOAuthState(stateToken: string): Promise<{ teamId: string; userId: string } | null> {
  const { data, error } = await getServiceSupabase()
    .from('atlassian_oauth_states')
    .select('team_id, user_id, expires_at')
    .eq('state_token', stateToken)
    .single();

  if (error || !data) {
    console.error('[Atlassian] Invalid OAuth state token');
    return null;
  }

  // Delete the token (one-time use)
  await getServiceSupabase()
    .from('atlassian_oauth_states')
    .delete()
    .eq('state_token', stateToken);

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    console.error('[Atlassian] OAuth state token expired');
    return null;
  }

  return { teamId: data.team_id, userId: data.user_id };
}

/**
 * Build the Atlassian OAuth authorization URL
 */
export async function buildAtlassianAuthUrl(teamId: string, userId: string): Promise<string> {
  const stateToken = await createOAuthState(teamId, userId);

  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: getClientId(),
    scope: JIRA_SCOPES.join(' '),
    redirect_uri: getRedirectUri(),
    state: stateToken,
    response_type: 'code',
    prompt: 'consent',
  });

  return `${ATLASSIAN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<AtlassianGrant> {
  console.log('[Atlassian] Exchanging code for tokens');

  const response = await fetch(ATLASSIAN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: getClientId(),
      client_secret: getClientSecret(),
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Atlassian] Token exchange failed:', error);
    throw new Error(`Failed to exchange code: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    scopes: data.scope?.split(' ') || JIRA_SCOPES,
  };
}

/**
 * Get accessible Atlassian resources (Jira sites the user can access)
 */
export async function getAccessibleResources(accessToken: string): Promise<AtlassianSite[]> {
  console.log('[Atlassian] Fetching accessible resources');

  const response = await fetch(`${ATLASSIAN_API_URL}/oauth/token/accessible-resources`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Atlassian] Failed to get accessible resources:', error);
    throw new Error(`Failed to get accessible resources: ${error.message || 'Unknown error'}`);
  }

  const resources = await response.json();

  return resources.map((r: any) => ({
    id: r.id,
    url: r.url,
    name: r.name,
    scopes: r.scopes || [],
    avatarUrl: r.avatarUrl,
  }));
}

/**
 * Get user info from Atlassian (email)
 */
export async function getAtlassianUserInfo(accessToken: string): Promise<{ email: string; name: string } | null> {
  try {
    const response = await fetch(`${ATLASSIAN_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error('[Atlassian] Failed to get user info');
      return null;
    }

    const data = await response.json();
    return {
      email: data.email,
      name: data.name || data.displayName,
    };
  } catch (error) {
    console.error('[Atlassian] Error getting user info:', error);
    return null;
  }
}

/**
 * Refresh the access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AtlassianGrant> {
  console.log('[Atlassian] Refreshing access token');

  const response = await fetch(ATLASSIAN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Atlassian] Token refresh failed:', error);
    throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Atlassian may return a new refresh token
    tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    scopes: data.scope?.split(' ') || JIRA_SCOPES,
  };
}

/**
 * Get Jira integration config for a team
 */
export async function getJiraIntegrationConfig(teamId: string): Promise<JiraIntegrationConfig | null> {
  const { data, error } = await getServiceSupabase()
    .from('team_integrations')
    .select('config')
    .eq('team_id', teamId)
    .eq('provider', 'jira')
    .single();

  if (error || !data) {
    return null;
  }

  const config = data.config as JiraIntegrationConfig;

  // Decrypt tokens if they are encrypted (contain ':' separator from AES-GCM format)
  try {
    if (config.access_token?.includes(':')) {
      config.access_token = decrypt(config.access_token);
    }
    if (config.refresh_token?.includes(':')) {
      config.refresh_token = decrypt(config.refresh_token);
    }
  } catch (err) {
    console.error('[Atlassian] Error decrypting tokens, they may be in plaintext:', err);
  }

  return config;
}

/**
 * Get a valid access token for a team, refreshing if necessary
 */
export async function getValidAccessToken(teamId: string): Promise<string | null> {
  const config = await getJiraIntegrationConfig(teamId);
  if (!config) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired = new Date(config.token_expiry).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    try {
      const refreshedGrant = await refreshAccessToken(config.refresh_token);

      // Update only the token fields, preserving connected_by
      await updateJiraTokens(teamId, {
        access_token: refreshedGrant.accessToken,
        refresh_token: refreshedGrant.refreshToken,
        token_expiry: refreshedGrant.tokenExpiry.toISOString(),
      });

      return refreshedGrant.accessToken;
    } catch (error) {
      console.error('[Atlassian] Failed to refresh token:', error);
      return null;
    }
  }

  return config.access_token;
}

/**
 * Save Jira integration to team_integrations table
 */
export async function saveJiraIntegration(
  teamId: string,
  config: Omit<JiraIntegrationConfig, 'project_key'> & { project_key?: string },
  connectedBy?: string
): Promise<void> {
  // Encrypt tokens before storing
  const encryptedConfig = {
    ...config,
    access_token: encrypt(config.access_token),
    refresh_token: encrypt(config.refresh_token),
  };

  const { error } = await getServiceSupabase()
    .from('team_integrations')
    .upsert({
      team_id: teamId,
      provider: 'jira',
      config: encryptedConfig,
      connected_by: connectedBy || config.connected_email,
      connected_at: new Date().toISOString(),
    }, {
      onConflict: 'team_id,provider',
    });

  if (error) {
    console.error('[Atlassian] Error saving Jira integration:', error);
    throw error;
  }
}

/**
 * Update only the token fields during refresh (preserves connected_by)
 */
async function updateJiraTokens(
  teamId: string,
  tokens: { access_token: string; refresh_token: string; token_expiry: string }
): Promise<void> {
  const config = await getJiraIntegrationConfig(teamId);
  if (!config) {
    throw new Error('Jira integration not found');
  }

  // Encrypt tokens before storing
  const encryptedTokens = {
    access_token: encrypt(tokens.access_token),
    refresh_token: encrypt(tokens.refresh_token),
    token_expiry: tokens.token_expiry,
  };

  // Re-encrypt the existing tokens in config since getJiraIntegrationConfig decrypted them
  const encryptedConfig = {
    ...config,
    access_token: encryptedTokens.access_token,
    refresh_token: encryptedTokens.refresh_token,
    token_expiry: encryptedTokens.token_expiry,
  };

  const { error } = await getServiceSupabase()
    .from('team_integrations')
    .update({
      config: encryptedConfig,
    })
    .eq('team_id', teamId)
    .eq('provider', 'jira');

  if (error) {
    console.error('[Atlassian] Error updating tokens:', error);
    throw error;
  }
}

/**
 * Update Jira project keys in the integration config.
 * Accepts a single key or an array of keys.
 */
export async function updateJiraProjectKey(teamId: string, projectKeys: string | string[]): Promise<void> {
  const config = await getJiraIntegrationConfig(teamId);
  if (!config) {
    throw new Error('Jira integration not found');
  }

  const keys = Array.isArray(projectKeys) ? projectKeys : [projectKeys];

  // Re-encrypt tokens since getJiraIntegrationConfig decrypted them
  const { error } = await getServiceSupabase()
    .from('team_integrations')
    .update({
      config: {
        ...config,
        access_token: encrypt(config.access_token),
        refresh_token: encrypt(config.refresh_token),
        project_key: keys[0], // backward compat
        project_keys: keys,
      },
    })
    .eq('team_id', teamId)
    .eq('provider', 'jira');

  if (error) {
    console.error('[Atlassian] Error updating project keys:', error);
    throw error;
  }
}

/**
 * Revoke and delete Jira integration for a team
 */
export async function revokeJiraIntegration(teamId: string): Promise<void> {
  const config = await getJiraIntegrationConfig(teamId);

  if (config?.access_token) {
    // Atlassian doesn't have a revoke endpoint, but we can try to invalidate via POST
    // In practice, the token will just expire naturally
    try {
      // Note: Atlassian OAuth doesn't have a standard revoke endpoint
      // The best we can do is delete our stored tokens
      console.log('[Atlassian] Revoking Jira integration (deleting stored tokens)');
    } catch (error) {
      console.error('[Atlassian] Error during revocation:', error);
    }
  }

  // Delete from team_integrations
  const { error } = await getServiceSupabase()
    .from('team_integrations')
    .delete()
    .eq('team_id', teamId)
    .eq('provider', 'jira');

  if (error) {
    console.error('[Atlassian] Error deleting Jira integration:', error);
    throw error;
  }
}

/**
 * Get the team slug for a team ID
 */
export async function getTeamSlug(teamId: string): Promise<string | null> {
  const { data, error } = await getServiceSupabase()
    .from('teams')
    .select('slug')
    .eq('id', teamId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.slug;
}
