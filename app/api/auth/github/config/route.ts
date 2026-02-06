import { NextResponse } from 'next/server';
import { isGitHubAppConfigured } from '@/lib/services/github-oauth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/github/config
 * Returns whether the GitHub App OAuth flow is available.
 * Used by the frontend to decide between OAuth button vs PAT-only form.
 */
export async function GET() {
  return NextResponse.json({
    githubAppEnabled: isGitHubAppConfigured(),
  });
}
