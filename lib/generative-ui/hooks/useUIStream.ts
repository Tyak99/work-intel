import { useState, useCallback, useRef } from 'react';

// Streaming JSON parser for generative UI responses
// Handles incremental parsing of JSONL streams

export interface StreamState<T> {
  data: T | null;
  isStreaming: boolean;
  error: string | null;
  partialData: Partial<T> | null;
}

interface UseUIStreamOptions<T> {
  onPartial?: (partial: Partial<T>) => void;
  onComplete?: (data: T) => void;
  onError?: (error: string) => void;
}

export function useUIStream<T>(options: UseUIStreamOptions<T> = {}) {
  const [state, setState] = useState<StreamState<T>>({
    data: null,
    isStreaming: false,
    error: null,
    partialData: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const parseStreamLine = useCallback((line: string): Partial<T> | null => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':')) return null; // Skip empty lines and comments

    try {
      // Handle SSE format: data: {...}
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') return null;
        return JSON.parse(jsonStr);
      }

      // Handle plain JSONL
      return JSON.parse(trimmed);
    } catch (e) {
      console.warn('Failed to parse stream line:', trimmed);
      return null;
    }
  }, []);

  const stream = useCallback(async (
    url: string,
    body: Record<string, any>
  ): Promise<T | null> => {
    // Abort any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState({
      data: null,
      isStreaming: true,
      error: null,
      partialData: null,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type');

      // Handle non-streaming JSON response
      if (contentType?.includes('application/json')) {
        const data = await response.json() as T;
        setState({
          data,
          isStreaming: false,
          error: null,
          partialData: null,
        });
        options.onComplete?.(data);
        return data;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated: Partial<T> = {};

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const parsed = parseStreamLine(line);
          if (parsed) {
            // Merge partial data
            accumulated = { ...accumulated, ...parsed };

            setState(prev => ({
              ...prev,
              partialData: accumulated,
            }));

            options.onPartial?.(accumulated);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const parsed = parseStreamLine(buffer);
        if (parsed) {
          accumulated = { ...accumulated, ...parsed };
        }
      }

      const finalData = accumulated as T;
      setState({
        data: finalData,
        isStreaming: false,
        error: null,
        partialData: null,
      });
      options.onComplete?.(finalData);
      return finalData;

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
        }));
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : 'Stream failed';
      setState({
        data: null,
        isStreaming: false,
        error: errorMessage,
        partialData: null,
      });
      options.onError?.(errorMessage);
      return null;
    }
  }, [options, parseStreamLine]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    abort();
    setState({
      data: null,
      isStreaming: false,
      error: null,
      partialData: null,
    });
  }, [abort]);

  return {
    ...state,
    stream,
    abort,
    reset,
  };
}
