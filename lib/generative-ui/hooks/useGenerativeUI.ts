import { useState, useCallback } from 'react';
import { useDashboardStore } from '@/lib/store';
import type { GeneratedViewData, UINode } from '../types';
import { useUIStream } from './useUIStream';

interface UseGenerativeUIOptions {
  onViewGenerated?: (view: GeneratedViewData) => void;
  onError?: (error: string) => void;
}

interface UseGenerativeUIReturn {
  generatedView: GeneratedViewData | null;
  isGenerating: boolean;
  error: string | null;
  promptInput: string;
  setPromptInput: (value: string) => void;
  generateView: (prompt?: string) => Promise<GeneratedViewData | null>;
  clearView: () => void;
}

export function useGenerativeUI(
  options: UseGenerativeUIOptions = {}
): UseGenerativeUIReturn {
  const { brief } = useDashboardStore();
  const [generatedView, setGeneratedView] = useState<GeneratedViewData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');

  const generateView = useCallback(async (prompt?: string): Promise<GeneratedViewData | null> => {
    const finalPrompt = prompt || promptInput;

    if (!finalPrompt.trim()) {
      setError('Please enter a prompt');
      return null;
    }

    if (!brief) {
      setError('No brief data available. Generate a brief first.');
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generative-ui/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: finalPrompt,
          brief,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const view: GeneratedViewData = {
        id: data.view?.id || `view-${Date.now()}`,
        title: data.view?.title || 'Generated View',
        description: data.view?.description,
        tree: data.view?.tree || { type: 'Stack', props: {}, children: [] },
        generatedAt: data.view?.generatedAt || new Date().toISOString(),
        prompt: finalPrompt,
      };

      setGeneratedView(view);
      options.onViewGenerated?.(view);
      return view;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate view';
      setError(message);
      options.onError?.(message);
      console.error('Error generating view:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [brief, promptInput, options]);

  const clearView = useCallback(() => {
    setGeneratedView(null);
    setError(null);
  }, []);

  return {
    generatedView,
    isGenerating,
    error,
    promptInput,
    setPromptInput,
    generateView,
    clearView,
  };
}

// === Preset Prompts ===
export const presetPrompts = [
  {
    label: 'Who\'s waiting on me?',
    prompt: 'Show me everyone who is waiting on me, sorted by how long they\'ve been waiting. Include PRs awaiting my review and emails needing my response.',
  },
  {
    label: 'PR Review Queue',
    prompt: 'Show my PR review queue as cards sorted by age, with the oldest PRs first. Show the author, age, and a brief summary.',
  },
  {
    label: 'Today\'s Timeline',
    prompt: 'Create a timeline view of my day including all meetings, with prep notes and related items for each.',
  },
  {
    label: 'Critical Items',
    prompt: 'Show only critical and high-priority items across all sources in a focused view.',
  },
  {
    label: 'Blockers Overview',
    prompt: 'What\'s blocking people from me right now? Show any items where others are waiting for my input or action.',
  },
];
