import { NextRequest, NextResponse } from 'next/server';
import { createTask, updateTask, deleteTask, getTasks } from '@/lib/services/tasks';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const tasks = await getTasks(userId, date);
    
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error getting tasks:', error);
    return NextResponse.json(
      { error: 'Failed to get tasks' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, task } = body;

    if (!userId || !task) {
      return NextResponse.json(
        { error: 'userId and task are required' },
        { status: 400 }
      );
    }

    const newTask = await createTask(userId, task);
    
    return NextResponse.json({ task: newTask });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, taskId, updates } = body;

    if (!userId || !taskId || !updates) {
      return NextResponse.json(
        { error: 'userId, taskId, and updates are required' },
        { status: 400 }
      );
    }

    const updatedTask = await updateTask(userId, taskId, updates);
    
    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const taskId = searchParams.get('taskId');

    if (!userId || !taskId) {
      return NextResponse.json(
        { error: 'userId and taskId are required' },
        { status: 400 }
      );
    }

    await deleteTask(userId, taskId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}