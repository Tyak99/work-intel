import {
  getUserDriveGrant,
  getWatchedFolders,
  fetchAllWatchedContent,
  DriveFolder,
  DriveFileContent,
} from './google-drive';

export interface DriveDataForBrief {
  connected: boolean;
  email: string | null;
  folders: {
    name: string;
    purpose: string | null;
    files: {
      name: string;
      modifiedTime: string;
      content: string;
      webViewLink?: string;
    }[];
  }[];
  totalFiles: number;
  summary: string;
}

/**
 * Fetch Drive data for brief generation
 * Gets content from all watched folders
 */
export async function fetchDriveData(userId: string): Promise<DriveDataForBrief | null> {
  try {
    console.log(`[DriveData] Fetching Drive data for user: ${userId}`);

    // Check if user has Drive connected
    const grant = await getUserDriveGrant(userId);
    if (!grant) {
      console.log('[DriveData] No Drive grant found');
      return null;
    }

    // Get watched folders
    const folders = await getWatchedFolders(userId);
    if (folders.length === 0) {
      console.log('[DriveData] No watched folders configured');
      return {
        connected: true,
        email: grant.email,
        folders: [],
        totalFiles: 0,
        summary: 'Google Drive connected but no folders selected for monitoring.',
      };
    }

    // Fetch content from last 7 days by default
    const modifiedAfter = new Date();
    modifiedAfter.setDate(modifiedAfter.getDate() - 7);

    const folderContents = await fetchAllWatchedContent(userId, {
      modifiedAfter,
      maxFilesPerFolder: 5, // Limit to avoid too much context
    });

    // Format for brief generation
    const formattedFolders = folderContents.map(({ folder, files }) => ({
      name: folder.folderName,
      purpose: folder.purpose,
      files: files.map(({ file, content }) => ({
        name: file.name,
        modifiedTime: file.modifiedTime,
        content: truncateContent(content, 5000), // Limit per file
        webViewLink: file.webViewLink,
      })),
    }));

    const totalFiles = formattedFolders.reduce((sum, f) => sum + f.files.length, 0);

    console.log(`[DriveData] Fetched ${totalFiles} files from ${folders.length} folders`);

    return {
      connected: true,
      email: grant.email,
      folders: formattedFolders,
      totalFiles,
      summary: `Found ${totalFiles} recently modified files across ${folders.length} watched folders.`,
    };
  } catch (error) {
    console.error('[DriveData] Error fetching Drive data:', error);
    return null;
  }
}

/**
 * Truncate content to a max length while preserving whole lines
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  // Find the last newline before the limit
  const truncated = content.substring(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n');

  if (lastNewline > maxLength * 0.8) {
    return truncated.substring(0, lastNewline) + '\n\n[Content truncated...]';
  }

  return truncated + '\n\n[Content truncated...]';
}
