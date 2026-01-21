import { NextRequest, NextResponse } from 'next/server';
import { connectTool, disconnectTool, getToolStatus } from '@/lib/services/tools';
import { getCurrentUserId } from '@/lib/services/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { toolType, credentials } = body;

    if (!toolType || !credentials) {
      return NextResponse.json(
        { error: 'toolType and credentials are required' },
        { status: 400 }
      );
    }

    const result = await connectTool(userId, toolType, credentials);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error connecting tool:', error);
    return NextResponse.json(
      { error: 'Failed to connect tool' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const toolType = searchParams.get('toolType');

    if (!toolType) {
      return NextResponse.json(
        { error: 'toolType is required' },
        { status: 400 }
      );
    }

    await disconnectTool(userId, toolType);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting tool:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect tool' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const toolStatus = await getToolStatus(userId);

    return NextResponse.json({ toolStatus });
  } catch (error) {
    console.error('Error getting tool status:', error);
    return NextResponse.json(
      { error: 'Failed to get tool status' },
      { status: 500 }
    );
  }
}