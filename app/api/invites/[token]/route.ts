import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import { auditLog } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const INVITE_TOKEN_COOKIE = 'pending_team_invite';

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

// GET /api/invites/[token] - Accept invite link
// Stores token in cookie and redirects to OAuth login
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const baseUrl = getBaseUrl();

  try {
    const { token } = await params;

    // Validate token exists
    const { data: invite, error } = await getServiceSupabase()
      .from('team_invites')
      .select(`
        id,
        team_id,
        email,
        role,
        github_username,
        expires_at,
        teams:team_id(name, slug)
      `)
      .eq('token', token)
      .single();

    if (error || !invite) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('Invalid or expired invitation')}`
      );
    }

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.redirect(
        `${baseUrl}/login?error=${encodeURIComponent('This invitation has expired. Please ask your team admin to send a new one.')}`
      );
    }

    const team = invite.teams as any;

    // Store token in cookie for OAuth callback to process
    const cookieStore = await cookies();
    cookieStore.set(INVITE_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour
    });

    auditLog('team.invite.accepted', { teamId: invite.team_id, email: invite.email });

    // Redirect to login page with context
    return NextResponse.redirect(
      `${baseUrl}/login?invite=true&team=${encodeURIComponent(team.name)}`
    );
  } catch (error) {
    console.error('Error processing invite:', error);
    return NextResponse.redirect(
      `${baseUrl}/login?error=${encodeURIComponent('Failed to process invitation')}`
    );
  }
}
