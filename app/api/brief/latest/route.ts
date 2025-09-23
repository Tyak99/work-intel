import { NextRequest, NextResponse } from 'next/server';
import { cache, cacheKeys } from '@/lib/cache';
import { Brief } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check for today's cached brief
    const today = new Date().toDateString();
    const cacheKey = cacheKeys.brief(userId, today);
    const cachedBrief = cache.get<Brief>(cacheKey);

    if (cachedBrief) {
      return NextResponse.json({
        brief: cachedBrief,
        cached: true,
        generatedAt: cachedBrief.generatedAt
      });
    }

    // No brief available for today
    return NextResponse.json({
      brief: null,
      cached: false,
      message: 'No brief available for today. Generate a new one.'
    });

  } catch (error) {
    console.error('Error fetching latest brief:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest brief' },
      { status: 500 }
    );
  }
}