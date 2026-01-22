'use client';

import { create } from 'zustand';
import { Brief, Todo, ToolStatus, DashboardState, SmartTodoItem, SmartTodo } from './types';
import toast from 'react-hot-toast';
import { extractAITodosFromBrief } from './services/briefProcessing';

// User type for client-side
export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

interface DashboardStore extends DashboardState {
  // User state
  user: User | null;
  isLoadingUser: boolean;

  // User actions
  fetchCurrentUser: () => Promise<User | null>;
  logout: () => Promise<void>;

  // Existing actions
  fetchLatestBrief: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  generateDailyBrief: () => Promise<void>;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  refreshToolStatus: () => Promise<void>;

  // Smart Todo state (new centralized system)
  smartTodos: SmartTodo[];
  expandedTodos: Set<string>;
  preparingTodoId: string | null;

  // Smart Todo actions
  generateAITodosFromBrief: (brief: Brief) => void;
  prepareTodoDraft: (todoId: string) => Promise<void>;
  updateTodoDraft: (todoId: string, content: string) => void;
  copyTodoDraft: (todoId: string) => Promise<void>;
  markTodoDone: (todoId: string) => void;
  toggleTodoExpanded: (todoId: string) => void;
  addManualSmartTodo: (title: string) => void;

  // Legacy Smart Action state (keeping for backward compatibility)
  preparingAction: SmartTodoItem | null;
  completedActions: Set<string>;
  isPreparingAction: boolean;

  // Legacy Smart Action methods
  prepareAction: (
    briefItemId: string,
    type: 'email_reply' | 'pr_nudge' | 'meeting_prep',
    sourceId: string,
    additionalData?: Record<string, any>
  ) => Promise<void>;
  markActionComplete: (briefItemId: string) => void;
  clearPreparedAction: () => void;
  updatePreparedActionDraft: (newDraft: string) => void;
}

// No mock data - use only real data

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  brief: null,
  todos: [],
  toolStatus: {},
  isGeneratingBrief: false,

  // User state
  user: null,
  isLoadingUser: true,

  // Smart Todo state
  smartTodos: [],
  expandedTodos: new Set<string>(),
  preparingTodoId: null,

  // Legacy state
  preparingAction: null,
  completedActions: new Set<string>(),
  isPreparingAction: false,

  fetchCurrentUser: async () => {
    set({ isLoadingUser: true });
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        set({ user: data.user, isLoadingUser: false });
        return data.user;
      } else {
        set({ user: null, isLoadingUser: false });
        return null;
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      set({ user: null, isLoadingUser: false });
      return null;
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      set({
        user: null,
        brief: null,
        todos: [],
        smartTodos: [],
        toolStatus: {},
      });
      // Redirect to login page
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  },

  fetchLatestBrief: async () => {
    try {
      const response = await fetch('/api/brief/latest', {
        credentials: 'include',
      });

      if (!response.ok) {
        // Not an error - just no brief available
        return;
      }

      const data = await response.json();
      if (data.brief) {
        // Generate AI todos from the loaded brief
        const aiTodos = extractAITodosFromBrief(data.brief);

        set({
          brief: data.brief,
          smartTodos: aiTodos,
        });
        console.log(`Loaded brief from ${data.source || 'cache'}`);
      }
    } catch (error) {
      console.error('Error fetching latest brief:', error);
      // Silent fail - user can generate a new one
    }
  },

  fetchTasks: async () => {
    try {
      const response = await fetch('/api/tasks', {
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (data.tasks) {
        set({ todos: data.tasks });
        console.log(`Loaded ${data.tasks.length} tasks`);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  },

  generateDailyBrief: async () => {
    set({ isGeneratingBrief: true });

    try {
      // Call the real API - user ID comes from session cookie
      const response = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to generate brief');
      }

      const data = await response.json();
      const generatedBrief = data.brief;
      
      const briefItems = [
        ...(generatedBrief.prsToReview || []),
        ...(generatedBrief.myPrsWaiting || []),
        ...(generatedBrief.emailsToActOn || []),
        ...(generatedBrief.jiraTasks || []),
      ];

      const extractedTodos = briefItems
        .filter((item: any) => item.actionNeeded && (item.priority === 'critical' || item.priority === 'high'))
        .map((item: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          title: item.title,
          description: [item.summary, item.context].filter(Boolean).join(' - '),
          completed: false,
          priority: item.priority || 'medium',
          source: item.source as Todo['source'],
          sourceId: item.sourceId,
          deadline: item.deadline,
          createdAt: new Date(),
        }));

      const currentTodos = get().todos;
      const newTodos = [...currentTodos, ...extractedTodos];

      // Generate AI-actionable smart todos from the brief
      const aiTodos = extractAITodosFromBrief(generatedBrief);
      const currentSmartTodos = get().smartTodos;

      // Filter out AI todos that already exist (by briefItemId)
      const existingBriefItemIds = new Set(currentSmartTodos.map(t => t.briefItemId).filter(Boolean));
      const newAiTodos = aiTodos.filter(t => !existingBriefItemIds.has(t.briefItemId));

      // Keep manual todos and add new AI todos
      const manualTodos = currentSmartTodos.filter(t => t.type === 'manual');
      const updatedSmartTodos = [...manualTodos, ...newAiTodos];

      set({
        brief: generatedBrief,
        todos: newTodos,
        smartTodos: updatedSmartTodos,
        isGeneratingBrief: false
      });

      const aiTodoCount = newAiTodos.length;
      toast.success(`Generated brief with ${briefItems.length} items, ${extractedTodos.length} tasks, and ${aiTodoCount} AI actions!`);
    } catch (error) {
      console.error('Error generating daily brief:', error);
      toast.error('Failed to generate brief. Please check your connections and try again.');

      set({
        isGeneratingBrief: false
      });
    }
  },

  addTodo: async (todoData) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ task: todoData }),
      });

      if (response.ok) {
        const data = await response.json();
        set(state => ({ todos: [...state.todos, data.task] }));
        toast.success('Task added successfully!');
      } else {
        throw new Error('Failed to add task');
      }
    } catch (error) {
      console.error('Error adding todo:', error);
      toast.error('Failed to save task to server. Added locally.');
      // Fallback to local state
      const newTodo: Todo = {
        ...todoData,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
      };
      set(state => ({ todos: [...state.todos, newTodo] }));
    }
  },

  toggleTodo: async (id) => {
    // Optimistic update
    const currentTodos = get().todos;
    const todo = currentTodos.find(t => t.id === id);
    if (!todo) return;

    const updatedTodo = { ...todo, completed: !todo.completed };
    set(state => ({
      todos: state.todos.map(t =>
        t.id === id ? updatedTodo : t
      )
    }));

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          taskId: id,
          updates: { completed: updatedTodo.completed },
        }),
      });
    } catch (error) {
      console.error('Error toggling todo:', error);
      toast.error('Failed to update task on server');
      // Revert on error
      set(state => ({
        todos: state.todos.map(t =>
          t.id === id ? todo : t
        )
      }));
    }
  },

  updateTodo: async (id, updates) => {
    // Optimistic update
    set(state => ({
      todos: state.todos.map(todo =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    }));

    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId: id, updates }),
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      // TODO: Handle error and revert if needed
    }
  },

  refreshToolStatus: async () => {
    try {
      const response = await fetch('/api/tools/connect', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        set({ toolStatus: data.toolStatus });
      }
    } catch (error) {
      console.error('Error refreshing tool status:', error);
    }
  },

  prepareAction: async (briefItemId, type, sourceId, additionalData) => {
    set({ isPreparingAction: true });

    try {
      const brief = get().brief;

      const response = await fetch('/api/brief/prepare-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          briefItemId,
          type,
          sourceId,
          briefContext: brief,
          additionalData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to prepare action');
      }

      const data = await response.json();
      const action = data.action as SmartTodoItem;

      set({
        preparingAction: action,
        isPreparingAction: false,
      });

      if (action.status === 'error') {
        toast.error(action.error || 'Failed to prepare action');
      }
    } catch (error) {
      console.error('Error preparing action:', error);
      toast.error('Failed to prepare action. Please try again.');
      set({ isPreparingAction: false });
    }
  },

  markActionComplete: (briefItemId) => {
    set(state => {
      const newCompleted = new Set(state.completedActions);
      newCompleted.add(briefItemId);
      return { completedActions: newCompleted };
    });
  },

  clearPreparedAction: () => {
    set({ preparingAction: null });
  },

  updatePreparedActionDraft: (newDraft) => {
    set(state => {
      if (!state.preparingAction) return state;
      return {
        preparingAction: {
          ...state.preparingAction,
          draftContent: newDraft,
        },
      };
    });
  },

  // New Smart Todo actions
  generateAITodosFromBrief: (brief) => {
    const aiTodos = extractAITodosFromBrief(brief);
    const currentSmartTodos = get().smartTodos;

    // Filter out AI todos that already exist (by briefItemId)
    const existingBriefItemIds = new Set(currentSmartTodos.map(t => t.briefItemId).filter(Boolean));
    const newAiTodos = aiTodos.filter(t => !existingBriefItemIds.has(t.briefItemId));

    // Keep manual todos and add new AI todos
    const manualTodos = currentSmartTodos.filter(t => t.type === 'manual');
    const updatedSmartTodos = [...manualTodos, ...newAiTodos];

    set({ smartTodos: updatedSmartTodos });
  },

  prepareTodoDraft: async (todoId) => {
    const todo = get().smartTodos.find(t => t.id === todoId);
    if (!todo || todo.type === 'manual') return;

    set({ preparingTodoId: todoId });

    // Update todo status to 'preparing'
    set(state => ({
      smartTodos: state.smartTodos.map(t =>
        t.id === todoId ? { ...t, status: 'preparing' as const } : t
      ),
    }));

    try {
      const brief = get().brief;

      // Map SmartTodo type to API type
      const typeMap: Record<string, 'email_reply' | 'pr_nudge' | 'meeting_prep'> = {
        ai_email_reply: 'email_reply',
        ai_pr_nudge: 'pr_nudge',
        ai_meeting_prep: 'meeting_prep',
      };
      const apiType = typeMap[todo.type];
      if (!apiType) {
        throw new Error('Invalid todo type');
      }

      const response = await fetch('/api/brief/prepare-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          briefItemId: todo.briefItemId || todo.id,
          type: apiType,
          sourceId: todo.sourceId || todo.id,
          briefContext: brief,
          additionalData: todo.originalContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to prepare draft');
      }

      const data = await response.json();
      const draftContent = data.action?.draftContent || '';

      // Update todo with draft content and status
      set(state => ({
        smartTodos: state.smartTodos.map(t =>
          t.id === todoId
            ? { ...t, status: 'ready' as const, draftContent }
            : t
        ),
        preparingTodoId: null,
      }));
    } catch (error) {
      console.error('Error preparing draft:', error);
      toast.error('Failed to prepare draft. Please try again.');

      // Revert status to pending
      set(state => ({
        smartTodos: state.smartTodos.map(t =>
          t.id === todoId ? { ...t, status: 'pending' as const } : t
        ),
        preparingTodoId: null,
      }));
    }
  },

  updateTodoDraft: (todoId, content) => {
    set(state => ({
      smartTodos: state.smartTodos.map(t =>
        t.id === todoId ? { ...t, draftContent: content } : t
      ),
    }));
  },

  copyTodoDraft: async (todoId) => {
    const todo = get().smartTodos.find(t => t.id === todoId);
    if (!todo?.draftContent) return;

    try {
      await navigator.clipboard.writeText(todo.draftContent);
      toast.success('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  },

  markTodoDone: (todoId) => {
    set(state => ({
      smartTodos: state.smartTodos.map(t =>
        t.id === todoId ? { ...t, status: 'done' as const } : t
      ),
    }));
  },

  toggleTodoExpanded: (todoId) => {
    set(state => {
      const newExpanded = new Set(state.expandedTodos);
      if (newExpanded.has(todoId)) {
        newExpanded.delete(todoId);
      } else {
        newExpanded.add(todoId);
      }
      return { expandedTodos: newExpanded };
    });
  },

  addManualSmartTodo: (title) => {
    const newTodo: SmartTodo = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      type: 'manual',
      source: 'manual',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    set(state => ({
      smartTodos: [...state.smartTodos, newTodo],
    }));
    toast.success('Task added!');
  },
}));

// Note: Tool status is now refreshed after user authentication
// See Dashboard component for initialization
