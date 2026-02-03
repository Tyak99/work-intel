import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const founderEmail = process.env.FOUNDER_EMAIL;

    // If FOUNDER_EMAIL is not set, no one can access /personal
    if (!founderEmail) {
      return NextResponse.json({ isFounder: false });
    }

    // Case-insensitive comparison
    const isFounder = user.email.toLowerCase() === founderEmail.toLowerCase();

    return NextResponse.json({ isFounder });
  } catch (error) {
    console.error('Error checking founder status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
