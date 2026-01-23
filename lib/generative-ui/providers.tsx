'use client';

// Generative UI Providers
// DataProvider: Supplies brief data to the generative UI system
// ActionProvider: Handles action callbacks from generated UI

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { useDashboardStore } from '@/lib/store';
import type { Brief } from '@/lib/types';
import type { ActionPayload, Suggestion } from './types';
import toast from 'react-hot-toast';

// === Data Context ===
interface DataContextValue {
  brief: Brief | null;
  isLoading: boolean;
  user: { id: string; email: string; displayName: string | null } | null;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { brief, isGeneratingBrief, user } = useDashboardStore();

  const value = useMemo(() => ({
    brief,
    isLoading: isGeneratingBrief,
    user,
  }), [brief, isGeneratingBrief, user]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// === Action Context ===
interface ActionContextValue {
  handleAction: (action: ActionPayload) => Promise<void>;
  dismissSuggestion: (id: string) => void;
  snoozeSuggestion: (id: string, duration: number) => void;
}

const ActionContext = createContext<ActionContextValue | null>(null);

export function useActionContext() {
  const context = useContext(ActionContext);
  if (!context) {
    throw new Error('useActionContext must be used within an ActionProvider');
  }
  return context;
}

interface ActionProviderProps {
  children: React.ReactNode;
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string, duration: number) => void;
}

export function ActionProvider({
  children,
  onDismiss,
  onSnooze,
}: ActionProviderProps) {
  const { prepareAction, brief } = useDashboardStore();

  const handleAction = useCallback(async (action: ActionPayload) => {
    switch (action.type) {
      case 'draft_email_reply':
        if (action.sourceId) {
          // Find the email in brief to get context
          const email = brief?.emailsToActOn?.find(e => e.sourceId === action.sourceId);
          if (email) {
            await prepareAction(
              email.id,
              'email_reply',
              action.sourceId,
              { email }
            );
            toast.success('Preparing email draft...');
          } else {
            toast.error('Email not found in brief');
          }
        }
        break;

      case 'draft_pr_nudge':
        if (action.sourceId) {
          // Find the PR in brief
          const pr = brief?.myPrsWaiting?.find(p => p.sourceId === action.sourceId) ||
                    brief?.prsToReview?.find(p => p.sourceId === action.sourceId);
          if (pr) {
            await prepareAction(
              pr.id,
              'pr_nudge',
              action.sourceId,
              { pr }
            );
            toast.success('Preparing PR nudge...');
          } else {
            toast.error('PR not found in brief');
          }
        }
        break;

      case 'draft_meeting_prep':
        if (action.sourceId) {
          const meeting = brief?.meetings?.find(m => m.id === action.sourceId);
          if (meeting) {
            await prepareAction(
              meeting.id,
              'meeting_prep',
              action.sourceId,
              { meeting }
            );
            toast.success('Preparing meeting notes...');
          } else {
            toast.error('Meeting not found in brief');
          }
        }
        break;

      case 'open_url':
        if (action.url) {
          window.open(action.url, '_blank', 'noopener,noreferrer');
        }
        break;

      case 'copy_to_clipboard':
        if (action.content) {
          try {
            await navigator.clipboard.writeText(action.content);
            toast.success('Copied to clipboard!');
          } catch (err) {
            toast.error('Failed to copy to clipboard');
          }
        }
        break;

      case 'dismiss':
        // Handled by dismissSuggestion
        break;

      case 'snooze':
        // Handled by snoozeSuggestion
        break;

      default:
        console.warn('Unknown action type:', action.type);
    }
  }, [brief, prepareAction]);

  const dismissSuggestion = useCallback((id: string) => {
    onDismiss?.(id);
  }, [onDismiss]);

  const snoozeSuggestion = useCallback((id: string, duration: number) => {
    onSnooze?.(id, duration);
    toast.success(`Snoozed for ${duration} minutes`);
  }, [onSnooze]);

  const value = useMemo(() => ({
    handleAction,
    dismissSuggestion,
    snoozeSuggestion,
  }), [handleAction, dismissSuggestion, snoozeSuggestion]);

  return (
    <ActionContext.Provider value={value}>
      {children}
    </ActionContext.Provider>
  );
}

// === Combined Provider ===
interface GenerativeUIProviderProps {
  children: React.ReactNode;
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string, duration: number) => void;
}

export function GenerativeUIContextProvider({
  children,
  onDismiss,
  onSnooze,
}: GenerativeUIProviderProps) {
  return (
    <DataProvider>
      <ActionProvider onDismiss={onDismiss} onSnooze={onSnooze}>
        {children}
      </ActionProvider>
    </DataProvider>
  );
}
