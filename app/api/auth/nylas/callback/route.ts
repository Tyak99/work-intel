import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForGrant } from '@/lib/services/nylas';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      const errorDescription = searchParams.get('error_description');
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/?auth=error&message=${encodeURIComponent(errorDescription || 'Authentication failed')}`
      );
    }

    if (!code || !state) {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/?auth=error&message=Missing+authorization+code`);
    }

    const userId = state;

    try {
      const grant = await exchangeCodeForGrant(code, userId);

      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/?auth=success&email=${encodeURIComponent(grant.email)}&provider=${grant.provider}`
      );
    } catch (error) {
      console.error('Error exchanging code:', error);
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/?auth=error&message=Failed+to+complete+authentication`);
    }
  } catch (error) {
    console.error('Error in Nylas callback:', error);
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://yourdomain.com'
      : 'http://localhost:3000';
    return NextResponse.redirect(`${baseUrl}/?auth=error&message=Authentication+failed`);
  }
}