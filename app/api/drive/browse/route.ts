import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/services/auth';
import { listAvailableFolders } from '@/lib/services/google-drive';

/**
 * GET /api/drive/browse - Browse available folders
 * Optional query param: parentId (to browse into a subfolder)
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

    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId') || undefined;

    const folders = await listAvailableFolders(userId, parentId);

    return NextResponse.json({
      folders,
      parentId: parentId || null,
    });
  } catch (error) {
    console.error('[Drive Browse] Error:', error);
    return NextResponse.json(
      { error: 'Failed to browse folders' },
      { status: 500 }
    );
  }
}
