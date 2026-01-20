import { Brief, Todo } from '@/lib/types';

// In-memory storage for tasks (replace with database later)
const userTasks: Record<string, Todo[]> = {};

export async function getTasks(userId: string, date?: string | null): Promise<Todo[]> {
  const tasks = userTasks[userId] || [];
  
  if (date) {
    const targetDate = new Date(date);
    return tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate.toDateString() === targetDate.toDateString();
    });
  }
  
  return tasks;
}

export async function createTask(userId: string, taskData: Omit<Todo, 'id' | 'createdAt'>): Promise<Todo> {
  const newTask: Todo = {
    ...taskData,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
  };

  if (!userTasks[userId]) {
    userTasks[userId] = [];
  }
  
  userTasks[userId].push(newTask);
  
  return newTask;
}

export async function updateTask(userId: string, taskId: string, updates: Partial<Todo>): Promise<Todo | null> {
  const tasks = userTasks[userId] || [];
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  
  if (taskIndex === -1) {
    return null;
  }
  
  userTasks[userId][taskIndex] = { ...tasks[taskIndex], ...updates };
  
  return userTasks[userId][taskIndex];
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const tasks = userTasks[userId] || [];
  const taskIndex = tasks.findIndex(task => task.id === taskId);
  
  if (taskIndex === -1) {
    return false;
  }
  
  userTasks[userId].splice(taskIndex, 1);
  
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
      const task: Todo = {
        id: Math.random().toString(36).substr(2, 9),
        title: item.title,
        description: [item.summary, item.context].filter(Boolean).join(' - '),
        completed: false,
        priority: item.priority,
        source: item.source,
        sourceId: item.sourceId,
        createdAt: new Date(),
      };

      tasks.push(task);
    }
  }
  
  // Add to user's task list
  if (!userTasks[userId]) {
    userTasks[userId] = [];
  }
  
  userTasks[userId].push(...tasks);
  
  return tasks;
}
