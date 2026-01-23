'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { renderUITree } from '@/lib/generative-ui/registry';
import { useActionContext } from '@/lib/generative-ui/providers';
import { useTheme } from '@/components/theme-provider';
import type { GeneratedViewData, UINode } from '@/lib/generative-ui/types';
import { Button } from '@/components/ui/button';
import {
  X,
  Sparkles,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface GeneratedViewProps {
  view: GeneratedViewData;
  onClose?: () => void;
  onRefresh?: () => void;
  className?: string;
  variant?: 'card' | 'modal' | 'inline';
}

export function GeneratedView({
  view,
  onClose,
  onRefresh,
  className,
  variant = 'card',
}: GeneratedViewProps) {
  const { hasGlowEffects } = useTheme();
  const { handleAction } = useActionContext();

  const renderContent = () => {
    if (!view.tree) {
      return (
        <div className="text-center text-muted-foreground py-8">
          No content generated
        </div>
      );
    }

    return renderUITree(view.tree, { onAction: handleAction });
  };

  if (variant === 'modal') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'w-full max-w-3xl max-h-[80vh] rounded-xl border bg-background overflow-hidden',
            hasGlowEffects && 'shadow-2xl shadow-primary/20',
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">{view.title}</h2>
                {view.description && (
                  <p className="text-sm text-muted-foreground">{view.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {view.prompt && (
                <div className="text-xs text-muted-foreground max-w-[200px] truncate">
                  "{view.prompt}"
                </div>
              )}

              {onRefresh && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}

              {onClose && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
            {renderContent()}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Generated {new Date(view.generatedAt).toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              AI Generated View
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">{view.title}</h2>
              {view.description && (
                <p className="text-sm text-muted-foreground">{view.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div>{renderContent()}</div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Generated {new Date(view.generatedAt).toLocaleTimeString()}
          </div>
          {view.prompt && (
            <div className="truncate max-w-[300px]">
              Prompt: "{view.prompt}"
            </div>
          )}
        </div>
      </div>
    );
  }

  // Card variant (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-xl border bg-card overflow-hidden',
        hasGlowEffects && 'shadow-lg shadow-primary/10',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{view.title}</span>
        </div>

        <div className="flex items-center gap-1">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}

          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Description */}
      {view.description && (
        <div className="px-4 py-2 text-sm text-muted-foreground border-b">
          {view.description}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {renderContent()}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{new Date(view.generatedAt).toLocaleTimeString()}</span>
      </div>
    </motion.div>
  );
}
