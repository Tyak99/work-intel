import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForGrant } from '@/lib/services/nylas';
import {
  findOrCreateUser,
  createSession,
  setSessionCookie,
  linkNylasGrantToUser,
} from '@/lib/services/auth';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();

  console.log('[OAuth Callback] Starting callback handler');
  console.log('[OAuth Callback] Base URL:', baseUrl);
  console.log('[OAuth Callback] Full request URL:', req.url);
  console.log('[OAuth Callback] NYLAS_REDIRECT_URI:', process.env.NYLAS_REDIRECT_URI);
  console.log('[OAuth Callback] NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('[OAuth Callback] Params - code:', code ? `${code.substring(0, 10)}...` : 'null');
    console.log('[OAuth Callback] Params - state:', state);
    console.log('[OAuth Callback] Params - error:', error);

    if (error) {
      console.error('[OAuth Callback] OAuth error from provider:', error);
      const errorDescription = searchParams.get('error_description');
      console.error('[OAuth Callback] Error description:', errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent(errorDescription || 'Authentication failed')}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Missing authorization code')}`
      );
    }

    // Check if this is a login flow (state starts with 'login_') or a connect flow (existing user)
    const isLoginFlow = state.startsWith('login_');
    console.log('[OAuth Callback] Is login flow:', isLoginFlow);

    try {
      // Exchange code for grant - use a temporary ID for login flow
      const tempUserId = isLoginFlow ? state : state;
      console.log('[OAuth Callback] Exchanging code for grant, tempUserId:', tempUserId);
      const grant = await exchangeCodeForGrant(code, tempUserId);
      console.log('[OAuth Callback] Grant received:', { email: grant.email, provider: grant.provider, grantId: grant.grantId });

      if (isLoginFlow) {
        // LOGIN FLOW: Create/find user and session
        // 1. Find or create user by email
        const user = await findOrCreateUser(grant.email);

        // 2. Link the Nylas grant to the user
        await linkNylasGrantToUser(user.id, tempUserId);

        // 3. Create a session
        const sessionToken = await createSession(user.id);

        // 4. Set the session cookie
        await setSessionCookie(sessionToken);

        // 5. Redirect to dashboard with success message
        return NextResponse.redirect(
          `${baseUrl}/?auth=success&email=${encodeURIComponent(grant.email)}&provider=${grant.provider}`
        );
      } else {
        // CONNECT FLOW: Existing user connecting additional account
        // The state is the user ID in this case
        return NextResponse.redirect(
          `${baseUrl}/?auth=success&email=${encodeURIComponent(grant.email)}&provider=${grant.provider}`
        );
      }
    } catch (error) {
      console.error('[OAuth Callback] Error in inner try block:', error);
      console.error('[OAuth Callback] Error details:', error instanceof Error ? error.message : String(error));
      console.error('[OAuth Callback] Error stack:', error instanceof Error ? error.stack : 'No stack');
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Failed to complete authentication')}`
      );
    }
  } catch (error) {
    console.error('[OAuth Callback] Error in outer try block:', error);
    console.error('[OAuth Callback] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[OAuth Callback] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Authentication failed')}`
    );
  }
}