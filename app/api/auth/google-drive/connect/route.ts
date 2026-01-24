import { NextRequest, NextResponse } from 'next/server';
import { buildDriveAuthUrl } from '@/lib/services/google-drive';
import { getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    // Get user ID from session - must be authenticated to connect Drive
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please login first' },
        { status: 401 }
      );
    }

    const authUrl = buildDriveAuthUrl(userId);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[GoogleDrive Connect] Error building auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Drive authentication' },
      { status: 500 }
    );
  }
}
