import { cookies } from 'next/headers';
import { supabase, UserRow, SessionRow } from '../supabase';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'work_intel_session';
const SESSION_DURATION_DAYS = 30;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

/**
 * Find a user by email, or create one if they don't exist
 */
export async function findOrCreateUser(email: string, displayName?: string): Promise<UserRow> {
  // Try to find existing user
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (existingUser && !findError) {
    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', existingUser.id);

    return existingUser;
  }

  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email,
      display_name: displayName || email.split('@')[0],
    })
    .select()
    .single();

  if (createError || !newUser) {
    console.error('Error creating user:', createError);
    throw new Error('Failed to create user');
  }

  return newUser;
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  const { error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    });

  if (error) {
    console.error('Error creating session:', error);
    throw new Error('Failed to create session');
  }

  return token;
}

/**
 * Validate a session token and return the user
 */
export async function validateSession(token: string): Promise<AuthUser | null> {
  const { data: session, error } = await supabase
    .from('sessions')
    .select(`
      *,
      users:user_id (*)
    `)
    .eq('token', token)
    .single();

  if (error || !session) {
    return null;
  }

  // Check if session is expired
  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await supabase.from('sessions').delete().eq('id', session.id);
    return null;
  }

  const user = session.users as UserRow;
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
  };
}

/**
 * Get the current user from the session cookie (for use in API routes)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    return validateSession(sessionCookie.value);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get user ID from session for API routes
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id || null;
}

/**
 * Set the session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Destroy a session (logout)
 */
export async function destroySession(token: string): Promise<void> {
  await supabase.from('sessions').delete().eq('token', token);
}

/**
 * Clear the session cookie (for logout)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get session token from cookie
 */
export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    return sessionCookie?.value || null;
  } catch {
    return null;
  }
}

/**
 * Link a Nylas grant to a user
 */
export async function linkNylasGrantToUser(userId: string, grantUserId: string): Promise<void> {
  const { error } = await supabase
    .from('nylas_grants')
    .update({ user_uuid: userId })
    .eq('user_id', grantUserId);

  if (error) {
    console.error('Error linking Nylas grant to user:', error);
  }
}

const INVITE_TOKEN_COOKIE = 'pending_team_invite';

export interface InviteProcessResult {
  processed: boolean;
  teamSlug?: string;
  teamId?: string;
}

/**
 * Process a pending invite from cookie token
 * Called after OAuth to auto-join team if invite token is present
 */
export async function processPendingInvite(userId: string): Promise<InviteProcessResult> {
  try {
    const cookieStore = await cookies();
    const inviteToken = cookieStore.get(INVITE_TOKEN_COOKIE)?.value;

    if (!inviteToken) {
      return { processed: false };
    }

    // Clear the cookie immediately
    cookieStore.delete(INVITE_TOKEN_COOKIE);

    // Find the invite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select(`
        id,
        team_id,
        role,
        github_username,
        teams:team_id(slug)
      `)
      .eq('token', inviteToken)
      .single();

    if (inviteError || !invite) {
      console.error('Invite not found for token');
      return { processed: false };
    }

    const team = invite.teams as any;

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', invite.team_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      // Already a member, just delete the invite
      await supabase.from('team_invites').delete().eq('id', invite.id);
      return { processed: true, teamSlug: team.slug, teamId: invite.team_id };
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invite.team_id,
        user_id: userId,
        role: invite.role,
        github_username: invite.github_username,
      });

    if (memberError) {
      console.error('Error adding user to team:', memberError);
      return { processed: false };
    }

    // Delete the invite
    await supabase.from('team_invites').delete().eq('id', invite.id);

    console.log(`User ${userId} joined team ${invite.team_id} via invite`);
    return { processed: true, teamSlug: team.slug, teamId: invite.team_id };
  } catch (error) {
    console.error('Error processing pending invite:', error);
    return { processed: false };
  }
}

/**
 * Process any pending invites by email (for users who sign up without clicking invite link)
 * Called after OAuth to auto-join teams that have pending invites for this email
 */
export async function processInvitesByEmail(userId: string, email: string): Promise<InviteProcessResult[]> {
  try {
    // Find all pending invites for this email
    const { data: invites, error } = await supabase
      .from('team_invites')
      .select(`
        id,
        team_id,
        role,
        github_username,
        teams:team_id(slug)
      `)
      .eq('email', email);

    if (error || !invites || invites.length === 0) {
      return [];
    }

    const results: InviteProcessResult[] = [];

    for (const invite of invites) {
      const team = invite.teams as any;

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', invite.team_id)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        // Already a member, just delete the invite
        await supabase.from('team_invites').delete().eq('id', invite.id);
        results.push({ processed: true, teamSlug: team.slug, teamId: invite.team_id });
        continue;
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: invite.team_id,
          user_id: userId,
          role: invite.role,
          github_username: invite.github_username,
        });

      if (memberError) {
        console.error(`Error adding user to team ${invite.team_id}:`, memberError);
        results.push({ processed: false });
        continue;
      }

      // Delete the invite
      await supabase.from('team_invites').delete().eq('id', invite.id);

      console.log(`User ${userId} auto-joined team ${invite.team_id} via email match`);
      results.push({ processed: true, teamSlug: team.slug, teamId: invite.team_id });
    }

    return results;
  } catch (error) {
    console.error('Error processing invites by email:', error);
    return [];
  }
}
