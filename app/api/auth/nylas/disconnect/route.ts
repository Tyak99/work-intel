import { NextRequest, NextResponse } from 'next/server';
import { revokeGrant } from '@/lib/services/nylas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await revokeGrant(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Nylas:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}