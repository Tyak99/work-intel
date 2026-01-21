import { Brief, Todo } from '@/lib/types';
import { supabase, TaskRow } from '../supabase';

/**
 * Convert a database row to a Todo object
 */
function taskRowToTodo(row: TaskRow): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    completed: row.completed,
    priority: row.priority || 'medium',
    source: (row.source as Todo['source']) || 'manual',
    sourceId: row.source_id || undefined,
    url: row.url || undefined,
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    createdAt: new Date(row.created_at),
  };
}

export async function getTasks(userId: string, date?: string | null): Promise<Todo[]> {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (date) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();
    query = query.gte('created_at', startOfDay).lte('created_at', endOfDay);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return (data || []).map(taskRowToTodo);
}

export async function createTask(userId: string, taskData: Omit<Todo, 'id' | 'createdAt'>): Promise<Todo> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: taskData.title,
      description: taskData.description || null,
      completed: taskData.completed || false,
      priority: taskData.priority || 'medium',
      source: taskData.source || 'manual',
      source_id: taskData.sourceId || null,
      url: taskData.url || null,
      due_date: taskData.dueDate?.toISOString() || null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating task:', error);
    throw new Error('Failed to create task');
  }

  return taskRowToTodo(data);
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Todo>): Promise<Todo | null> {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.completed !== undefined) updateData.completed = updates.completed;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.source !== undefined) updateData.source = updates.source;
  if (updates.sourceId !== undefined) updateData.source_id = updates.sourceId;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate?.toISOString() || null;

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    return null;
  }

  return data ? taskRowToTodo(data) : null;
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting task:', error);
    return false;
  }

  return true;
}

export async function createTasksFromBrief(userId: string, brief: Brief): Promise<Todo[]> {
  const tasks: Todo[] = [];

  const briefItems = [
    ...(brief.prsToReview || []),
    ...(brief.myPrsWaiting || []),
    ...(brief.emailsToActOn || []),
    ...(brief.jiraTasks || []),
  ];

  for (const item of briefItems) {
    if (item.actionNeeded && (item.priority === 'critical' || item.priority === 'high')) {
      try {
        const task = await createTask(userId, {
          title: item.title,
          description: [item.summary, item.context].filter(Boolean).join(' - '),
          completed: false,
          priority: item.priority,
          source: item.source,
          sourceId: item.sourceId,
          url: item.url,
        });
        tasks.push(task);
      } catch (error) {
        console.error('Error creating task from brief item:', error);
      }
    }
  }

  return tasks;
}
