import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefService } from '@/lib/services/brief';
import { getCurrentUserId } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Check if this is a Vercel cron request
    const cronHeader = req.headers.get('x-vercel-cron');

    let userId: string | null = null;

    if (cronHeader) {
      // Cron job - try to get userId from body, otherwise skip
      console.log('Processing Vercel cron job request for daily brief generation');
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
      generatedBy: cronHeader ? 'cron' : 'manual',
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
  const cronHeader = req.headers.get('x-vercel-cron');

  if (cronHeader) {
    console.log('Processing GET cron request');
    return POST(req);
  }

  // For non-cron GET requests, redirect to latest brief
  return NextResponse.json(
    { error: 'Use POST to generate a new brief or GET /api/brief/latest for cached brief' },
    { status: 405 }
  );
}