'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGenerativeUI, presetPrompts } from '@/lib/generative-ui/hooks/useGenerativeUI';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Send,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Wand2,
  Lightbulb,
} from 'lucide-react';

interface PromptInputProps {
  className?: string;
  onViewGenerated?: () => void;
  placeholder?: string;
  showPresets?: boolean;
  variant?: 'inline' | 'floating' | 'modal';
}

export function PromptInput({
  className,
  onViewGenerated,
  placeholder = 'Ask anything about your work...',
  showPresets = true,
  variant = 'inline',
}: PromptInputProps) {
  const { hasGlowEffects } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    promptInput,
    setPromptInput,
    generateView,
    isGenerating,
    error,
  } = useGenerativeUI({
    onViewGenerated: () => {
      onViewGenerated?.();
      setIsExpanded(false);
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowPresetsDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isGenerating) return;
    await generateView();
  };

  const handlePresetClick = async (prompt: string) => {
    setPromptInput(prompt);
    setShowPresetsDropdown(false);
    await generateView(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsExpanded(false);
      setShowPresetsDropdown(false);
    }
  };

  if (variant === 'floating') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4',
          className
        )}
      >
        <motion.div
          initial={false}
          animate={{
            y: isExpanded ? 0 : 60,
            opacity: isExpanded ? 1 : 0.95,
          }}
          className={cn(
            'rounded-xl border bg-background/95 backdrop-blur-md overflow-hidden',
            hasGlowEffects && 'shadow-lg shadow-primary/10'
          )}
        >
          <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
            <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />

            <Input
              ref={inputRef}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsExpanded(true)}
              placeholder={placeholder}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-sm"
              disabled={isGenerating}
            />

            {showPresets && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
                className="h-8 w-8 p-0"
              >
                <Lightbulb className="h-4 w-4" />
              </Button>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={!promptInput.trim() || isGenerating}
              className="h-8 gap-1"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate
                </>
              )}
            </Button>
          </form>

          {/* Presets dropdown */}
          <AnimatePresence>
            {showPresetsDropdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t"
              >
                <div className="p-2 space-y-1">
                  <div className="text-xs text-muted-foreground px-2 py-1">
                    Quick prompts
                  </div>
                  {presetPrompts.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => handlePresetClick(preset.prompt)}
                      className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 text-xs text-red-500 border-t bg-red-500/5">
              {error}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Inline variant
  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <div
          className={cn(
            'flex-1 flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2 transition-all',
            isExpanded && 'ring-1 ring-primary',
            hasGlowEffects && isExpanded && 'shadow-md shadow-primary/10'
          )}
        >
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />

          <Input
            ref={inputRef}
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsExpanded(true)}
            onBlur={() => !showPresetsDropdown && setIsExpanded(false)}
            placeholder={placeholder}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 h-auto py-0 text-sm"
            disabled={isGenerating}
          />

          {promptInput && (
            <button
              type="button"
              onClick={() => setPromptInput('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {showPresets && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
            className="h-9"
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
        )}

        <Button
          type="submit"
          size="sm"
          disabled={!promptInput.trim() || isGenerating}
          className="h-9 gap-1"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              Generate
            </>
          )}
        </Button>
      </form>

      {/* Presets dropdown */}
      <AnimatePresence>
        {showPresetsDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-lg border bg-popover shadow-lg z-50"
          >
            <div className="p-2 space-y-1">
              <div className="text-xs text-muted-foreground px-2 py-1">
                Quick prompts
              </div>
              {presetPrompts.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetClick(preset.prompt)}
                  className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && (
        <div className="mt-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}
