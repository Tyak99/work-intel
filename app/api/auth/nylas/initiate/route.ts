import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/services/nylas';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    // Generate a temporary state for the OAuth flow
    // This will be used to track the OAuth flow, not as a permanent user ID
    const tempState = `login_${crypto.randomBytes(16).toString('hex')}`;

    const authUrl = buildAuthUrl(tempState);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Failed to initiate authentication')}`
    );
  }
}
