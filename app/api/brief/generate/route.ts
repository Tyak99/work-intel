import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefService } from '@/lib/services/brief';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Handle both manual requests and cron job calls
    let userId = 'user-1'; // Default user for cron jobs

    try {
      const body = await req.json();
      if (body.userId) {
        userId = body.userId;
      }
    } catch (jsonError) {
      // If JSON parsing fails (e.g., for cron requests with empty body), use default userId
      console.log('Using default userId for cron job or empty request');
    }

    // Check if this is a Vercel cron request
    const cronHeader = req.headers.get('x-vercel-cron');
    if (cronHeader) {
      console.log('Processing Vercel cron job request for daily brief generation');
    }

    console.log(`Generating brief for userId: ${userId}`);
    const brief = await generateDailyBriefService(userId);

    return NextResponse.json({
      brief,
      generatedBy: cronHeader ? 'cron' : 'manual',
      userId
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

  return NextResponse.json(
    { error: 'GET method not supported for manual requests' },
    { status: 405 }
  );
}