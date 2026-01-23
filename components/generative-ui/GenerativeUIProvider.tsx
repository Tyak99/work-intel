'use client';

import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GenerativeUIContextProvider } from '@/lib/generative-ui/providers';
import { useGenerativeUI } from '@/lib/generative-ui/hooks/useGenerativeUI';
import { ProactiveActionBar } from './ProactiveActionBar';
import { GeneratedView } from './GeneratedView';
import type { GeneratedViewData } from '@/lib/generative-ui/types';

interface GenerativeUIProviderProps {
  children: React.ReactNode;
  showActionBar?: boolean;
  actionBarPosition?: 'top' | 'bottom';
  maxSuggestions?: number;
}

export function GenerativeUIProvider({
  children,
  showActionBar = true,
  actionBarPosition = 'bottom',
  maxSuggestions = 5,
}: GenerativeUIProviderProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Map<string, number>>(new Map());
  const [generatedView, setGeneratedView] = useState<GeneratedViewData | null>(null);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleSnooze = useCallback((id: string, duration: number) => {
    const expiry = Date.now() + duration * 60 * 1000;
    setSnoozedIds(prev => {
      const next = new Map(prev);
      next.set(id, expiry);
      return next;
    });
  }, []);

  const handleCloseView = useCallback(() => {
    setGeneratedView(null);
  }, []);

  return (
    <GenerativeUIContextProvider
      onDismiss={handleDismiss}
      onSnooze={handleSnooze}
    >
      {children}

      {/* Proactive Action Bar */}
      {showActionBar && (
        <ProactiveActionBar
          position={actionBarPosition}
          maxSuggestions={maxSuggestions}
        />
      )}

      {/* Generated View Modal */}
      <AnimatePresence>
        {generatedView && (
          <GeneratedView
            view={generatedView}
            variant="modal"
            onClose={handleCloseView}
          />
        )}
      </AnimatePresence>
    </GenerativeUIContextProvider>
  );
}

// Export a hook to control the generative UI from anywhere
export function useGenerativeUIControl() {
  const [view, setView] = useState<GeneratedViewData | null>(null);

  const showView = useCallback((viewData: GeneratedViewData) => {
    setView(viewData);
  }, []);

  const hideView = useCallback(() => {
    setView(null);
  }, []);

  return {
    view,
    showView,
    hideView,
    isViewOpen: view !== null,
  };
}
