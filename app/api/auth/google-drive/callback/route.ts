import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, verifyOAuthState } from '@/lib/services/google-drive';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004';
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();

  console.log('[GoogleDrive Callback] Starting callback handler');
  console.log('[GoogleDrive Callback] URL:', req.url);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    console.log('[GoogleDrive Callback] Params - code:', code ? 'present' : 'null', 'state:', state ? 'present' : 'null', 'error:', errorParam);

    if (errorParam) {
      const errorDescription = searchParams.get('error_description');
      console.error('[GoogleDrive Callback] OAuth error from Google:', errorParam, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent(errorDescription || `OAuth rejected: ${errorParam}`)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // Verify CSRF state token and get the associated userId
    console.log('[GoogleDrive Callback] Verifying state token...');
    const userId = await verifyOAuthState(state);
    if (!userId) {
      console.error('[GoogleDrive Callback] Invalid or expired state token');
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent('Invalid or expired authentication session. Please try again.')}`
      );
    }

    console.log('[GoogleDrive Callback] State verified, exchanging code for tokens...');
    try {
      // Exchange code for tokens and save grant
      const grant = await exchangeCodeForTokens(code, userId);

      console.log('[GoogleDrive Callback] Grant received for:', grant.email);

      // Redirect back to dashboard with success
      return NextResponse.redirect(
        `${baseUrl}/?drive_connected=true&drive_email=${encodeURIComponent(grant.email)}`
      );
    } catch (exchangeError: any) {
      console.error('[GoogleDrive Callback] Token exchange error:', exchangeError);
      return NextResponse.redirect(
        `${baseUrl}/?drive_error=${encodeURIComponent(`Token exchange failed: ${exchangeError.message || exchangeError}`)}`
      );
    }
  } catch (error: any) {
    console.error('[GoogleDrive Callback] Unexpected error:', error);
    return NextResponse.redirect(
      `${baseUrl}/?drive_error=${encodeURIComponent(`Callback error: ${error.message || error}`)}`
    );
  }
}
