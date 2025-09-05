import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefService } from '@/lib/services/brief';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const brief = await generateDailyBriefService(userId);
    
    return NextResponse.json({ brief });
  } catch (error) {
    console.error('Error generating daily brief:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily brief' },
      { status: 500 }
    );
  }
}