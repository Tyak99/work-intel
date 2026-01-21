import { NextRequest, NextResponse } from 'next/server';
import { cache, cacheKeys } from '@/lib/cache';
import { Brief } from '@/lib/types';
import { getCurrentUserId } from '@/lib/services/auth';
import { getBriefFromDatabase } from '@/lib/services/brief';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for optional date parameter (for history viewing)
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // YYYY-MM-DD format

    if (date) {
      // Fetch specific date from database
      const brief = await getBriefFromDatabase(userId, date);
      if (brief) {
        return NextResponse.json({
          brief,
          cached: true,
          date,
          generatedAt: brief.generatedAt,
        });
      }
      return NextResponse.json({
        brief: null,
        cached: false,
        date,
        message: `No brief available for ${date}`,
      });
    }

    // Check for today's brief
    const today = new Date().toDateString();
    const cacheKey = cacheKeys.brief(userId, today);

    // L1 Cache: In-memory
    const cachedBrief = cache.get<Brief>(cacheKey);
    if (cachedBrief) {
      return NextResponse.json({
        brief: cachedBrief,
        cached: true,
        source: 'memory',
        generatedAt: cachedBrief.generatedAt,
      });
    }

    // L2 Cache: Database
    const dbBrief = await getBriefFromDatabase(userId);
    if (dbBrief) {
      // Populate L1 cache from L2
      cache.set(cacheKey, dbBrief, 60 * 60 * 1000);
      return NextResponse.json({
        brief: dbBrief,
        cached: true,
        source: 'database',
        generatedAt: dbBrief.generatedAt,
      });
    }

    // No brief available for today
    return NextResponse.json({
      brief: null,
      cached: false,
      message: 'No brief available for today. Generate a new one.',
    });

  } catch (error) {
    console.error('Error fetching latest brief:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest brief' },
      { status: 500 }
    );
  }
}