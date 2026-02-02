import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/services/auth';
import {
  getWatchedFolders,
  addWatchedFolder,
  removeWatchedFolder,
} from '@/lib/services/google-drive';

/**
 * GET /api/drive/folders - List watched folders
 */
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const folders = await getWatchedFolders(userId);

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('[Drive Folders GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/drive/folders - Add a folder to watch
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { folderId, folderName, purpose } = body;

    if (!folderId || !folderName) {
      return NextResponse.json(
        { error: 'folderId and folderName are required' },
        { status: 400 }
      );
    }

    const folder = await addWatchedFolder(userId, folderId, folderName, purpose);

    return NextResponse.json({ folder });
  } catch (error) {
    console.error('[Drive Folders POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/drive/folders - Remove a watched folder
 */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json(
        { error: 'folderId is required' },
        { status: 400 }
      );
    }

    await removeWatchedFolder(userId, folderId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Drive Folders DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove folder' },
      { status: 500 }
    );
  }
}
