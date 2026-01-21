import { NextRequest, NextResponse } from 'next/server';
import { prepareAction } from '@/lib/services/actionAgents';
import { Brief } from '@/lib/types';
import { getCurrentUserId } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

interface PrepareActionRequest {
  briefItemId: string;
  type: 'email_reply' | 'pr_nudge' | 'meeting_prep';
  sourceId: string;
  briefContext?: Brief;
  additionalData?: Record<string, any>;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: PrepareActionRequest = await req.json();

    const { briefItemId, type, sourceId, briefContext, additionalData } = body;

    // Validate required fields
    if (!type || !sourceId) {
      return NextResponse.json(
        { error: 'Missing required fields: type, sourceId' },
        { status: 400 }
      );
    }

    // Validate action type
    if (!['email_reply', 'pr_nudge', 'meeting_prep'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid action type. Must be: email_reply, pr_nudge, or meeting_prep' },
        { status: 400 }
      );
    }

    console.log(`Preparing ${type} action for sourceId: ${sourceId}, userId: ${userId}`);

    const smartTodoItem = await prepareAction(
      type,
      sourceId,
      userId,
      briefContext,
      additionalData
    );

    return NextResponse.json({
      success: true,
      action: smartTodoItem,
    });
  } catch (error) {
    console.error('Error preparing action:', error);
    return NextResponse.json(
      {
        error: 'Failed to prepare action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
