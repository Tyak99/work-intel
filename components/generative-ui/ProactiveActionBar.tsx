'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useProactiveSuggestions } from '@/lib/generative-ui/hooks/useProactiveSuggestions';
import { useActionContext } from '@/lib/generative-ui/providers';
import { useTheme } from '@/components/theme-provider';
import type { Suggestion, ActionPayload } from '@/lib/generative-ui/types';
import { Button } from '@/components/ui/button';
import {
  GitPullRequest,
  Mail,
  Calendar,
  CheckSquare,
  ExternalLink,
  Clock,
  X,
  Sparkles,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// === Source Icons ===
const sourceIcons: Record<string, React.ReactNode> = {
  github: <GitPullRequest className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  jira: <CheckSquare className="h-4 w-4" />,
};

// === Urgency Colors ===
const urgencyColors: Record<string, string> = {
  critical: 'border-red-500/50 bg-red-500/5',
  high: 'border-orange-500/50 bg-orange-500/5',
  medium: 'border-yellow-500/50 bg-yellow-500/5',
  low: 'border-blue-500/50 bg-blue-500/5',
};

const urgencyGlowColors: Record<string, string> = {
  critical: 'shadow-red-500/20',
  high: 'shadow-orange-500/20',
  medium: 'shadow-yellow-500/20',
  low: 'shadow-blue-500/20',
};

// === Suggestion Card Component ===
interface SuggestionCardProps {
  suggestion: Suggestion;
  onAction: (action: ActionPayload) => void;
  onDismiss: () => void;
  onSnooze: (duration: number) => void;
}

function SuggestionCard({ suggestion, onAction, onDismiss, onSnooze }: SuggestionCardProps) {
  const { hasGlowEffects } = useTheme();
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'relative rounded-lg border p-4 space-y-3 transition-all min-w-[280px] max-w-[320px] flex-shrink-0',
        urgencyColors[suggestion.urgency],
        hasGlowEffects && `shadow-lg ${urgencyGlowColors[suggestion.urgency]}`
      )}
    >
      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-background/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 pr-6">
        <div className="text-primary mt-0.5">
          {sourceIcons[suggestion.source]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm leading-tight">{suggestion.title}</div>
          {suggestion.subtitle && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {suggestion.subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Reason - the "why" */}
      <div className="text-xs text-muted-foreground bg-background/50 rounded px-2 py-1.5 flex items-start gap-1.5">
        <Sparkles className="h-3 w-3 mt-0.5 text-primary/60 flex-shrink-0" />
        <span>{suggestion.reason}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {suggestion.actions.slice(0, 2).map((action, i) => (
          <Button
            key={i}
            variant={action.variant === 'primary' ? 'default' : 'secondary'}
            size="sm"
            onClick={() => onAction(action.action)}
            className="h-7 text-xs gap-1"
          >
            {action.icon === 'external' && <ExternalLink className="h-3 w-3" />}
            {action.label}
          </Button>
        ))}

        {/* Snooze button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
            className="h-7 text-xs gap-1"
          >
            <Clock className="h-3 w-3" />
            Snooze
          </Button>

          {showSnoozeOptions && (
            <div className="absolute bottom-full left-0 mb-1 bg-popover border rounded-md shadow-lg p-1 z-50">
              {[15, 30, 60, 240].map(minutes => (
                <button
                  key={minutes}
                  onClick={() => {
                    onSnooze(minutes);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded-sm"
                >
                  {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// === Main Action Bar Component ===
interface ProactiveActionBarProps {
  className?: string;
  maxSuggestions?: number;
  position?: 'bottom' | 'top';
}

export function ProactiveActionBar({
  className,
  maxSuggestions = 5,
  position = 'bottom',
}: ProactiveActionBarProps) {
  const { t, hasGlowEffects, hasAnimations } = useTheme();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    suggestions,
    isLoading,
    error,
    fetchSuggestions,
    dismissSuggestion,
    snoozeSuggestion,
  } = useProactiveSuggestions({ maxSuggestions });

  const { handleAction } = useActionContext();

  // Don't render if no suggestions and not loading
  if (!isLoading && suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 pointer-events-none',
        position === 'bottom' ? 'bottom-16' : 'top-20',
        className
      )}
    >
      <div className="container mx-auto px-4 pointer-events-auto">
        <div
          className={cn(
            'rounded-xl border bg-background/95 backdrop-blur-md overflow-hidden transition-all',
            hasGlowEffects && 'shadow-lg shadow-primary/10'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t('aiSuggestions') || 'AI Suggestions'}</span>
              {suggestions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({suggestions.length})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchSuggestions}
                disabled={isLoading}
                className="h-7 w-7 p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-7 w-7 p-0"
              >
                {isMinimized ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4">
                  {error ? (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      {error}
                    </div>
                  ) : isLoading && suggestions.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Analyzing your brief...
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-4 overflow-x-auto pb-2 -mb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                      <AnimatePresence mode="popLayout">
                        {suggestions.map(suggestion => (
                          <SuggestionCard
                            key={suggestion.id}
                            suggestion={suggestion}
                            onAction={handleAction}
                            onDismiss={() => dismissSuggestion(suggestion.id)}
                            onSnooze={(duration) => snoozeSuggestion(suggestion.id, duration)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
