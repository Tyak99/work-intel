import { NextRequest, NextResponse } from 'next/server';
import { connectTool, disconnectTool, getToolStatus } from '@/lib/services/tools';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, toolType, credentials } = body;

    if (!userId || !toolType || !credentials) {
      return NextResponse.json(
        { error: 'userId, toolType, and credentials are required' },
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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const toolType = searchParams.get('toolType');

    if (!userId || !toolType) {
      return NextResponse.json(
        { error: 'userId and toolType are required' },
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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
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