import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/services/nylas';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const authUrl = buildAuthUrl(userId);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error building auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}