import Nylas from 'nylas';

export interface NylasGrant {
  grantId: string;
  email: string;
  provider: string;
  scopes: string[];
  createdAt: Date;
  lastSync?: Date;
}

const userGrants: Record<string, NylasGrant> = {};

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

    // Nylas v3 OAuth token exchange with API key authentication
    const tokenBody = {
      client_id: clientId,
      client_secret: process.env.NYLAS_API_KEY, // Use API Key as client_secret
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: 'nylas', // Required for Nylas v3
    };

    const apiUri = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';
    const response = await fetch(`${apiUri}/v3/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header needed for token exchange
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

    userGrants[userId] = grant;

    return grant;
  } catch (error) {
    console.error('Error exchanging code for grant:', error);
    throw error;
  }
}

export function getUserGrant(userId: string): NylasGrant | null {
  return userGrants[userId] || null;
}

export function setUserGrant(userId: string, grant: NylasGrant): void {
  userGrants[userId] = grant;
}

export async function revokeGrant(userId: string): Promise<void> {
  const grant = getUserGrant(userId);
  if (!grant) {
    return;
  }

  try {
    const apiUri = process.env.NYLAS_API_URI || 'https://api.us.nylas.com';

    await fetch(`${apiUri}/v3/grants/${grant.grantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.NYLAS_API_KEY}`,
      },
    });

    delete userGrants[userId];
  } catch (error) {
    console.error('Error revoking grant:', error);
    throw error;
  }
}

export async function testNylasConnection(userId: string): Promise<boolean> {
  try {
    const grant = getUserGrant(userId);
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

export function updateLastSync(userId: string): void {
  const grant = getUserGrant(userId);
  if (grant) {
    grant.lastSync = new Date();
  }
}