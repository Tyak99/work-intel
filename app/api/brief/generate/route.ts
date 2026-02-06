import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefService } from '@/lib/services/brief';
import { getCurrentUserId } from '@/lib/services/auth';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest) {
  try {
    const isCron = verifyCronSecret(req);

    let userId: string | null = null;

    if (isCron) {
      // Cron job - try to get userId from body, otherwise skip
      console.log('Processing authenticated cron job request for daily brief generation');
      try {
        const body = await req.json();
        userId = body.userId;
      } catch {
        // No body provided - cron job without specific user
        console.log('Cron job without specific user - skipping');
        return NextResponse.json({
          message: 'Cron job received but no user specified',
          generatedBy: 'cron',
        });
      }
    } else {
      // Regular request - get user from session
      userId = await getCurrentUserId();

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Rate limit: 5 brief generations per day per user (non-cron only)
      const rl = rateLimit(`brief-generate:${userId}`, 5, 24 * 60 * 60 * 1000);
      if (!rl.success) {
        return NextResponse.json(
          { error: 'Brief generation limit reached. Please try again later.' },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) },
          }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    console.log(`Generating brief for userId: ${userId}`);
    const brief = await generateDailyBriefService(userId);

    return NextResponse.json({
      brief,
      generatedBy: isCron ? 'cron' : 'manual',
    });
  } catch (error) {
    console.error('Error generating daily brief:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily brief' },
      { status: 500 }
    );
  }
}

// Also handle GET requests for cron jobs (Vercel sometimes sends GET)
export async function GET(req: NextRequest) {
  if (verifyCronSecret(req)) {
    console.log('Processing GET cron request');
    return POST(req);
  }

  // For non-cron GET requests, redirect to latest brief
  return NextResponse.json(
    { error: 'Use POST to generate a new brief or GET /api/brief/latest for cached brief' },
    { status: 405 }
  );
}