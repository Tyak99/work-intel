import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/services/nylas';
import { getCurrentUserId } from '@/lib/services/auth';

export async function GET(req: NextRequest) {
  try {
    // Get user ID from session - this is for authenticated users connecting accounts
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - please login first' },
        { status: 401 }
      );
    }

    // Use the user's UUID directly for the OAuth state
    // This connects the grant to their account
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