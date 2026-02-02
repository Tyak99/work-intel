import { NextRequest, NextResponse } from 'next/server';
import { revokeDriveGrant } from '@/lib/services/google-drive';
import { getCurrentUserId } from '@/lib/services/auth';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await revokeDriveGrant(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[GoogleDrive Disconnect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Drive' },
      { status: 500 }
    );
  }
}
