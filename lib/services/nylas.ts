import Nylas from 'nylas';
import { supabase } from '../supabase';

export interface NylasGrant {
  grantId: string;
  email: string;
  provider: string;
  scopes: string[];
  createdAt: Date;
  lastSync?: Date;
}

let nylasClient: Nylas | null = null;

export function getNylasClient(): Nylas {
  if (!nylasClient) {
    const apiKey = process.env.NYLAS_API_KEY;
    const apiUri = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

    if (!apiKey) {
      throw new Error('NYLAS_API_KEY is not configured');
    }

    nylasClient = new Nylas({
      apiKey,
      apiUri,
    });
  }

  return nylasClient;
}

export function buildAuthUrl(userId: string, state?: string): string {
  const clientId = process.env.NYLAS_CLIENT_ID;
  const redirectUri = process.env.NYLAS_REDIRECT_URI || 'http://localhost:3000/api/auth/nylas/callback';

  if (!clientId) {
    throw new Error('NYLAS_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    // Minimal read-only scopes for security
    scopes: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
    state: state || userId,
    provider: 'google',
  });

  const apiUri = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';
  return `${apiUri}/v3/connect/auth?${params.toString()}`;
}

export async function exchangeCodeForGrant(code: string, userId: string): Promise<NylasGrant> {
  try {
    const clientId = process.env.NYLAS_CLIENT_ID;
    const redirectUri = process.env.NYLAS_REDIRECT_URI || 'http://localhost:3000/api/auth/nylas/callback';

    if (!clientId) {
      throw new Error('NYLAS_CLIENT_ID is not configured');
    }

    const nylas = getNylasClient();

    // Nylas v3 OAuth token exchange for web platform
    // Web platform requires client_secret in body, not just API key in header
    const tokenBody = {
      client_id: clientId,
      client_secret: process.env.NYLAS_API_KEY, // Use API key as client_secret per Nylas v3 docs
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: 'nylas', // Required for Nylas v3
    };

    const apiUri = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

    console.log('Token exchange request:', {
      url: `${apiUri}/v3/connect/token`,
      client_id: clientId,
      redirect_uri: redirectUri,
      has_client_secret: !!process.env.NYLAS_API_KEY,
      code_length: code.length
    });

    const response = await fetch(`${apiUri}/v3/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to exchange code: ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    const grantResponse = await fetch(`${apiUri}/v3/grants/${data.grant_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!grantResponse.ok) {
      throw new Error('Failed to fetch grant details');
    }

    const grantData = await grantResponse.json();

    const grant: NylasGrant = {
      grantId: data.grant_id,
      email: grantData.data.email || 'unknown',
      provider: grantData.data.provider || 'google',
      scopes: grantData.data.scopes || ['email.read', 'calendar.read'],
      createdAt: new Date(),
      lastSync: new Date(),
    };

    // Save grant to Supabase
    const { error } = await supabase
      .from('nylas_grants')
      .upsert({
        user_id: userId,
        grant_id: grant.grantId,
        email: grant.email,
        provider: grant.provider,
        scopes: grant.scopes,
        created_at: grant.createdAt.toISOString(),
        last_sync: grant.lastSync?.toISOString()
      });

    if (error) {
      console.error('Error saving grant to database:', error);
      // Continue anyway - the grant is still valid for this session
    }

    return grant;
  } catch (error) {
    console.error('Error exchanging code for grant:', error);
    throw error;
  }
}

export async function getUserGrant(userId: string): Promise<NylasGrant | null> {
  try {
    const { data, error } = await supabase
      .from('nylas_grants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No grant found
        return null;
      }
      console.error('Error fetching grant from database:', error);
      return null;
    }

    return {
      grantId: data.grant_id,
      email: data.email,
      provider: data.provider,
      scopes: data.scopes,
      createdAt: new Date(data.created_at),
      lastSync: data.last_sync ? new Date(data.last_sync) : undefined
    };
  } catch (error) {
    console.error('Error fetching grant:', error);
    return null;
  }
}

export async function setUserGrant(userId: string, grant: NylasGrant): Promise<void> {
  try {
    const { error } = await supabase
      .from('nylas_grants')
      .upsert({
        user_id: userId,
        grant_id: grant.grantId,
        email: grant.email,
        provider: grant.provider,
        scopes: grant.scopes,
        created_at: grant.createdAt.toISOString(),
        last_sync: grant.lastSync?.toISOString()
      });

    if (error) {
      console.error('Error saving grant to database:', error);
    }
  } catch (error) {
    console.error('Error setting grant:', error);
  }
}

export async function revokeGrant(userId: string): Promise<void> {
  const grant = await getUserGrant(userId);
  if (!grant) {
    return;
  }

  try {
    const apiUri = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

    // Revoke from Nylas
    await fetch(`${apiUri}/v3/grants/${grant.grantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
      },
    });

    // Delete from Supabase
    const { error } = await supabase
      .from('nylas_grants')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting grant from database:', error);
    }
  } catch (error) {
    console.error('Error revoking grant:', error);
    throw error;
  }
}

export async function testNylasConnection(userId: string): Promise<boolean> {
  try {
    const grant = await getUserGrant(userId);
    if (!grant) {
      return false;
    }

    const apiUri = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

    const response = await fetch(`${apiUri}/v3/grants/${grant.grantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error testing Nylas connection:', error);
    return false;
  }
}

export async function updateLastSync(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('nylas_grants')
      .update({ last_sync: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating last sync:', error);
    }
  } catch (error) {
    console.error('Error updating last sync:', error);
  }
}