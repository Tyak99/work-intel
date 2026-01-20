'use client';

import { create } from 'zustand';
import { Brief, Todo, ToolStatus, DashboardState, SmartTodoItem } from './types';
import toast from 'react-hot-toast';

interface DashboardStore extends DashboardState {
  // Existing actions
  generateDailyBrief: () => Promise<void>;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  refreshToolStatus: () => Promise<void>;

  // Smart Action state
  preparingAction: SmartTodoItem | null;
  completedActions: Set<string>;
  isPreparingAction: boolean;

  // Smart Action methods
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
  preparingAction: null,
  completedActions: new Set<string>(),
  isPreparingAction: false,

  generateDailyBrief: async () => {
    set({ isGeneratingBrief: true });
    
    try {
      // Call the real API
      const response = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-1' }) // TODO: Get from auth context
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

      set({ 
        brief: generatedBrief,
        todos: newTodos,
        isGeneratingBrief: false 
      });
      
      toast.success(`Generated brief with ${briefItems.length} items and ${extractedTodos.length} new tasks!`);
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
        body: JSON.stringify({ userId: 'user-1', task: todoData })
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
        body: JSON.stringify({ 
          userId: 'user-1', 
          taskId: id, 
          updates: { completed: updatedTodo.completed }
        })
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
        body: JSON.stringify({ userId: 'user-1', taskId: id, updates })
      });
    } catch (error) {
      console.error('Error updating todo:', error);
      // TODO: Handle error and revert if needed
    }
  },

  refreshToolStatus: async () => {
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/tools/connect?userId=user-1`);
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
        body: JSON.stringify({
          briefItemId,
          type,
          sourceId,
          userId: 'user-1', // TODO: Get from auth context
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
}));

// Initialize tool status when the store is created
const store = useDashboardStore.getState();
store.refreshToolStatus();
