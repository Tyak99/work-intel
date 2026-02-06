import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { getServiceSupabase, GitHubOAuthConfig } from '../supabase';

// --- Config helpers ---

function getAppId(): string {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) throw new Error('GITHUB_APP_ID is not configured');
  return appId;
}

function getAppSlug(): string {
  return process.env.GITHUB_APP_SLUG || 'work-intel';
}

function getPrivateKey(): string {
  const b64 = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!b64) throw new Error('GITHUB_APP_PRIVATE_KEY is not configured');
  return Buffer.from(b64, 'base64').toString('utf8');
}

// --- OAuth state management (CSRF protection) ---

export async function createOAuthState(
  teamId: string,
  userId: string,
  redirectTo?: 'onboarding' | 'settings'
): Promise<string> {
  // Clean up expired state tokens (opportunistic)
  await getServiceSupabase()
    .from('github_oauth_states')
    .delete()
    .lt('expires_at', new Date().toISOString());

  const stateToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  const { error } = await getServiceSupabase()
    .from('github_oauth_states')
    .insert({
      team_id: teamId,
      user_id: userId,
      state_token: stateToken,
      redirect_to: redirectTo || null,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('[GitHub OAuth] Error creating state:', error);
    throw error;
  }

  return stateToken;
}

export async function verifyOAuthState(
  stateToken: string
): Promise<{ teamId: string; userId: string; redirectTo: string | null } | null> {
  const { data, error } = await getServiceSupabase()
    .from('github_oauth_states')
    .select('team_id, user_id, redirect_to, expires_at')
    .eq('state_token', stateToken)
    .single();

  if (error || !data) {
    console.error('[GitHub OAuth] Invalid state token');
    return null;
  }

  // Check expiry before consuming
  if (new Date(data.expires_at) < new Date()) {
    // Delete expired token
    await getServiceSupabase()
      .from('github_oauth_states')
      .delete()
      .eq('state_token', stateToken);
    console.error('[GitHub OAuth] State token expired');
    return null;
  }

  // Delete valid token (one-time use)
  await getServiceSupabase()
    .from('github_oauth_states')
    .delete()
    .eq('state_token', stateToken);

  return {
    teamId: data.team_id,
    userId: data.user_id,
    redirectTo: data.redirect_to,
  };
}

// --- GitHub App installation URL ---

export function buildGitHubInstallUrl(stateToken: string): string {
  const slug = getAppSlug();
  const params = new URLSearchParams({ state: stateToken });
  return `https://github.com/apps/${slug}/installations/new?${params.toString()}`;
}

// --- Installation token management ---

export async function getInstallationAccessToken(
  installationId: number
): Promise<{ token: string; expiresAt: Date }> {
  const auth = createAppAuth({
    appId: getAppId(),
    privateKey: getPrivateKey(),
    installationId,
  });

  const result = await auth({ type: 'installation' });

  return {
    token: result.token,
    expiresAt: new Date(result.expiresAt || Date.now() + 60 * 60 * 1000),
  };
}

/**
 * Get org info from a GitHub App installation.
 */
export async function getInstallationInfo(
  installationId: number
): Promise<{ org: string; orgId: number } | null> {
  try {
    const { token } = await getInstallationAccessToken(installationId);
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.rest.apps.getInstallation({ installation_id: installationId });

    if (!data.account) {
      console.error('[GitHub OAuth] Installation has no account');
      return null;
    }

    return {
      org: (data.account as any).login,
      orgId: (data.account as any).id,
    };
  } catch (error) {
    console.error('[GitHub OAuth] Error getting installation info:', error);
    return null;
  }
}

// --- Integration persistence ---

export async function saveGitHubIntegration(
  teamId: string,
  config: GitHubOAuthConfig,
  connectedBy: string
): Promise<void> {
  const { error } = await getServiceSupabase()
    .from('team_integrations')
    .upsert(
      {
        team_id: teamId,
        provider: 'github',
        config,
        connected_by: connectedBy,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'team_id,provider' }
    );

  if (error) {
    console.error('[GitHub OAuth] Error saving integration:', error);
    throw error;
  }
}

/**
 * Get a valid GitHub token for a team using the GitHub App installation.
 * Generates a fresh short-lived token on every call (no storage needed).
 */
export async function getValidGitHubToken(
  teamId: string
): Promise<{ token: string; org: string } | null> {
  const { data, error } = await getServiceSupabase()
    .from('team_integrations')
    .select('config')
    .eq('team_id', teamId)
    .eq('provider', 'github')
    .single();

  if (error || !data) return null;

  const config = data.config as GitHubOAuthConfig;
  if (config.auth_type !== 'github_app') return null;

  try {
    const { token } = await getInstallationAccessToken(config.installation_id);
    return { token, org: config.org };
  } catch (err) {
    console.error('[GitHub OAuth] Failed to generate installation token:', err);
    return null;
  }
}

export async function revokeGitHubIntegration(teamId: string): Promise<void> {
  const { error } = await getServiceSupabase()
    .from('team_integrations')
    .delete()
    .eq('team_id', teamId)
    .eq('provider', 'github');

  if (error) {
    console.error('[GitHub OAuth] Error deleting integration:', error);
    throw error;
  }
}

// --- Helpers ---

export async function getTeamSlug(teamId: string): Promise<string | null> {
  const { data, error } = await getServiceSupabase()
    .from('teams')
    .select('slug')
    .eq('id', teamId)
    .single();

  if (error || !data) return null;
  return data.slug;
}

/**
 * Check if GitHub App env vars are configured.
 * Used to determine whether to show OAuth vs PAT-only in the UI.
 */
export function isGitHubAppConfigured(): boolean {
  return !!(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    process.env.GITHUB_APP_SLUG
  );
}
