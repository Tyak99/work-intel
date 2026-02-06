import { NextRequest, NextResponse } from 'next/server';
import {
  verifyOAuthState,
  getInstallationInfo,
  saveGitHubIntegration,
  getTeamSlug,
} from '@/lib/services/github-oauth';
import { getCurrentUser } from '@/lib/services/auth';
import { auditLog } from '@/lib/logger';
import { GitHubOAuthConfig } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004';
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl();

  try {
    const { searchParams } = new URL(req.url);
    const installationId = searchParams.get('installation_id');
    const setupAction = searchParams.get('setup_action');
    const state = searchParams.get('state');

    // User requested install but isn't org admin — they need to ask their org admin
    if (setupAction === 'request') {
      return NextResponse.redirect(
        `${baseUrl}/?github_error=${encodeURIComponent('Installation was requested but not completed. An organization admin needs to approve the GitHub App installation.')}`
      );
    }

    if (!installationId || !state) {
      return NextResponse.redirect(
        `${baseUrl}/?github_error=${encodeURIComponent('Missing installation_id or state parameter')}`
      );
    }

    // Verify CSRF state token
    const stateData = await verifyOAuthState(state);
    if (!stateData) {
      return NextResponse.redirect(
        `${baseUrl}/?github_error=${encodeURIComponent('Invalid or expired authentication session. Please try again.')}`
      );
    }

    const { teamId, userId, redirectTo } = stateData;

    // Get the authenticated user to record who connected
    const user = await getCurrentUser();
    const connectedEmail = user?.email || 'unknown';

    try {
      const installId = parseInt(installationId, 10);
      if (isNaN(installId)) {
        return NextResponse.redirect(
          `${baseUrl}/?github_error=${encodeURIComponent('Invalid installation ID')}`
        );
      }

      // Get org info from the installation
      const info = await getInstallationInfo(installId);
      if (!info) {
        return NextResponse.redirect(
          `${baseUrl}/?github_error=${encodeURIComponent('Could not fetch organization info from GitHub App installation.')}`
        );
      }

      // Save integration
      const config: GitHubOAuthConfig = {
        installation_id: installId,
        org: info.org,
        org_id: info.orgId,
        connected_email: connectedEmail,
        auth_type: 'github_app',
      };

      await saveGitHubIntegration(teamId, config, userId);

      auditLog('team.github.oauth_connected', {
        teamId,
        org: info.org,
        installationId: installId,
        connectedBy: userId,
      });

      // Redirect based on where the user came from
      const teamSlug = await getTeamSlug(teamId);

      if (redirectTo === 'onboarding' && teamSlug) {
        return NextResponse.redirect(
          `${baseUrl}/team/${teamSlug}/onboarding?step=0&github_connected=true`
        );
      } else if (teamSlug) {
        return NextResponse.redirect(
          `${baseUrl}/team/${teamSlug}/settings?github_connected=true`
        );
      } else {
        return NextResponse.redirect(`${baseUrl}/?github_connected=true`);
      }
    } catch (exchangeError: any) {
      console.error('[GitHub Callback] Installation token error:', exchangeError);
      return NextResponse.redirect(
        `${baseUrl}/?github_error=${encodeURIComponent('GitHub App setup failed. Please try again or contact support.')}`
      );
    }
  } catch (error: any) {
    console.error('[GitHub Callback] Unexpected error:', error);
    return NextResponse.redirect(
      `${baseUrl}/?github_error=${encodeURIComponent('An unexpected error occurred. Please try again.')}`
    );
  }
}
