import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  verifyOAuthState,
  getAccessibleResources,
  getAtlassianUserInfo,
  saveJiraIntegration,
  getTeamSlug,
} from '@/lib/services/atlassian-oauth';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004';
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();

  console.log('[Atlassian Callback] Starting callback handler');
  console.log('[Atlassian Callback] URL:', req.url);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    console.log('[Atlassian Callback] Params - code:', code ? 'present' : 'null', 'state:', state ? 'present' : 'null', 'error:', errorParam);

    if (errorParam) {
      const errorDescription = searchParams.get('error_description');
      console.error('[Atlassian Callback] OAuth error from Atlassian:', errorParam, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/?jira_error=${encodeURIComponent(errorDescription || `OAuth rejected: ${errorParam}`)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/?jira_error=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // Verify CSRF state token and get the associated teamId and userId
    console.log('[Atlassian Callback] Verifying state token...');
    const stateData = await verifyOAuthState(state);
    if (!stateData) {
      console.error('[Atlassian Callback] Invalid or expired state token');
      return NextResponse.redirect(
        `${baseUrl}/?jira_error=${encodeURIComponent('Invalid or expired authentication session. Please try again.')}`
      );
    }

    const { teamId, userId } = stateData;

    console.log('[Atlassian Callback] State verified, exchanging code for tokens...');
    try {
      // Exchange code for tokens
      const grant = await exchangeCodeForTokens(code);

      console.log('[Atlassian Callback] Tokens received, fetching accessible resources...');

      // Get accessible Jira sites
      const sites = await getAccessibleResources(grant.accessToken);

      if (sites.length === 0) {
        console.error('[Atlassian Callback] No accessible Jira sites found');
        return NextResponse.redirect(
          `${baseUrl}/?jira_error=${encodeURIComponent('No Jira sites found. Make sure you have access to at least one Jira site.')}`
        );
      }

      // For MVP, use the first site. Future: let user pick if multiple sites
      const site = sites[0];
      console.log('[Atlassian Callback] Using Jira site:', site.name, site.url);

      // Get user info for the connected email
      const userInfo = await getAtlassianUserInfo(grant.accessToken);
      const connectedEmail = userInfo?.email || 'unknown';

      // Save to team_integrations
      await saveJiraIntegration(teamId, {
        cloud_id: site.id,
        site_url: site.url,
        access_token: grant.accessToken,
        refresh_token: grant.refreshToken,
        token_expiry: grant.tokenExpiry.toISOString(),
        scopes: grant.scopes,
        connected_email: connectedEmail,
      }, userId);

      console.log('[Atlassian Callback] Jira integration saved for team:', teamId);

      // Get team slug for redirect
      const teamSlug = await getTeamSlug(teamId);

      if (teamSlug) {
        // Redirect to team settings with success
        return NextResponse.redirect(
          `${baseUrl}/team/${teamSlug}/settings?jira_connected=true`
        );
      } else {
        // Fallback to home with success
        return NextResponse.redirect(
          `${baseUrl}/?jira_connected=true`
        );
      }
    } catch (exchangeError: any) {
      console.error('[Atlassian Callback] Token exchange error:', exchangeError);
      return NextResponse.redirect(
        `${baseUrl}/?jira_error=${encodeURIComponent(`Token exchange failed: ${exchangeError.message || exchangeError}`)}`
      );
    }
  } catch (error: any) {
    console.error('[Atlassian Callback] Unexpected error:', error);
    return NextResponse.redirect(
      `${baseUrl}/?jira_error=${encodeURIComponent(`Callback error: ${error.message || error}`)}`
    );
  }
}
