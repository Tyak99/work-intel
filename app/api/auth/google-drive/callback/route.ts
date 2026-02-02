import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, verifyOAuthState } from '@/lib/services/google-drive';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004';
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();

  console.log('[GoogleDrive Callback] Starting callback handler');

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('[GoogleDrive Callback] OAuth error:', error);
      const errorDescription = searchParams.get('error_description');
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent(errorDescription || 'Google Drive authentication failed')}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent('Missing authorization code')}`
      );
    }

    // Verify CSRF state token and get the associated userId
    const userId = await verifyOAuthState(state);
    if (!userId) {
      console.error('[GoogleDrive Callback] Invalid or expired state token');
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent('Invalid or expired authentication session. Please try again.')}`
      );
    }

    try {
      // Exchange code for tokens and save grant
      const grant = await exchangeCodeForTokens(code, userId);

      console.log('[GoogleDrive Callback] Grant received for:', grant.email);

      // Redirect back to dashboard with success
      return NextResponse.redirect(
        `${baseUrl}/?drive_connected=true&drive_email=${encodeURIComponent(grant.email)}`
      );
    } catch (exchangeError) {
      console.error('[GoogleDrive Callback] Token exchange error:', exchangeError);
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent('Failed to complete Google Drive authentication')}`
      );
    }
  } catch (error) {
    console.error('[GoogleDrive Callback] Unexpected error:', error);
    return NextResponse.redirect(
      `${baseUrl}/?drive_error=${encodeURIComponent('Google Drive authentication failed')}`
    );
  }
}
