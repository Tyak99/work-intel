import { useState, useCallback, useEffect, useRef } from 'react';
import { useDashboardStore } from '@/lib/store';
import type { Suggestion, SuggestionsResponse } from '../types';
import { useUIStream } from './useUIStream';

interface UseProactiveSuggestionsOptions {
  autoFetch?: boolean;
  maxSuggestions?: number;
  refreshInterval?: number; // in milliseconds, 0 to disable
}

interface UseProactiveSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
  fetchSuggestions: () => Promise<void>;
  dismissSuggestion: (id: string) => void;
  snoozeSuggestion: (id: string, durationMinutes: number) => void;
  clearDismissed: () => void;
}

export function useProactiveSuggestions(
  options: UseProactiveSuggestionsOptions = {}
): UseProactiveSuggestionsReturn {
  const {
    autoFetch = true,
    maxSuggestions = 5,
    refreshInterval = 0,
  } = options;

  const { brief } = useDashboardStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lastBriefIdRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for expired snoozes
  useEffect(() => {
    const checkSnoozes = () => {
      const now = Date.now();
      setSnoozedIds(prev => {
        const updated = new Map(prev);
        let changed = false;
        Array.from(updated.entries()).forEach(([id, expiry]) => {
          if (expiry <= now) {
            updated.delete(id);
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    };

    // Check every minute
    const interval = setInterval(checkSnoozes, 60000);
    checkSnoozes(); // Initial check

    return () => clearInterval(interval);
  }, []);

  const fetchSuggestions = useCallback(async () => {
    if (!brief) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generative-ui/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          brief,
          maxSuggestions,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const data: SuggestionsResponse = await response.json();

      // Filter out dismissed and snoozed suggestions
      const now = Date.now();
      const filteredSuggestions = data.suggestions.filter(s => {
        if (dismissedIds.has(s.id)) return false;
        const snoozeExpiry = snoozedIds.get(s.id);
        if (snoozeExpiry && snoozeExpiry > now) return false;
        return true;
      });

      setSuggestions(filteredSuggestions);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      setError(message);
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [brief, maxSuggestions, dismissedIds, snoozedIds]);

  // Auto-fetch when brief changes
  useEffect(() => {
    if (!autoFetch || !brief) return;

    // Only fetch if brief has changed
    if (brief.id !== lastBriefIdRef.current) {
      lastBriefIdRef.current = brief.id;
      fetchSuggestions();
    }
  }, [autoFetch, brief, fetchSuggestions]);

  // Set up refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    refreshTimerRef.current = setInterval(fetchSuggestions, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [refreshInterval, fetchSuggestions]);

  const dismissSuggestion = useCallback((id: string) => {
    setDismissedIds(prev => {
      const updated = new Set(prev);
      updated.add(id);
      return updated;
    });

    // Remove from current suggestions immediately
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  const snoozeSuggestion = useCallback((id: string, durationMinutes: number) => {
    const expiryTime = Date.now() + durationMinutes * 60 * 1000;

    setSnoozedIds(prev => {
      const updated = new Map(prev);
      updated.set(id, expiryTime);
      return updated;
    });

    // Remove from current suggestions immediately
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  const clearDismissed = useCallback(() => {
    setDismissedIds(new Set());
    setSnoozedIds(new Map());
  }, []);

  // Filter suggestions on render (in case state changed)
  const filteredSuggestions = suggestions.filter(s => {
    if (dismissedIds.has(s.id)) return false;
    const snoozeExpiry = snoozedIds.get(s.id);
    if (snoozeExpiry && snoozeExpiry > Date.now()) return false;
    return true;
  });

  return {
    suggestions: filteredSuggestions,
    isLoading,
    error,
    fetchSuggestions,
    dismissSuggestion,
    snoozeSuggestion,
    clearDismissed,
  };
}
