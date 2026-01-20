'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Mail,
  GitPullRequest,
  Calendar,
  Copy,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SmartTodoItem } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface SmartActionModalProps {
  open: boolean;
  onClose: () => void;
}

const typeIcons = {
  email_reply: Mail,
  pr_nudge: GitPullRequest,
  meeting_prep: Calendar,
};

const typeLabels = {
  email_reply: 'Email Reply',
  pr_nudge: 'PR Nudge',
  meeting_prep: 'Meeting Prep',
};

const typeColors = {
  email_reply: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  pr_nudge: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  meeting_prep: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

export function SmartActionModal({ open, onClose }: SmartActionModalProps) {
  const {
    preparingAction,
    isPreparingAction,
    clearPreparedAction,
    markActionComplete,
    updatePreparedActionDraft,
    prepareAction,
    brief,
  } = useDashboardStore();

  const [showContext, setShowContext] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleClose = () => {
    clearPreparedAction();
    onClose();
  };

  const handleCopyToClipboard = async () => {
    if (!preparingAction?.draftContent) return;

    try {
      await navigator.clipboard.writeText(preparingAction.draftContent);
      markActionComplete(preparingAction.briefItemId);
      toast.success('Copied to clipboard!');
      handleClose();
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleRegenerate = async () => {
    if (!preparingAction) return;

    setIsRegenerating(true);
    try {
      await prepareAction(
        preparingAction.briefItemId,
        preparingAction.type,
        preparingAction.originalContent?.sourceId || preparingAction.briefItemId,
        preparingAction.originalContent
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updatePreparedActionDraft(e.target.value);
  };

  // Render loading state
  if (isPreparingAction || isRegenerating) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isRegenerating ? 'Regenerating draft...' : 'Preparing your action...'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render error state
  if (preparingAction?.status === 'error') {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Error
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {preparingAction.error || 'An error occurred while preparing the action.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={handleRegenerate}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // No action prepared
  if (!preparingAction) {
    return null;
  }

  const Icon = typeIcons[preparingAction.type];
  const typeLabel = typeLabels[preparingAction.type];
  const typeColor = typeColors[preparingAction.type];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">{preparingAction.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {typeLabel}
                </Badge>
                {preparingAction.status === 'ready' && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    <Check className="w-3 h-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context Section (collapsible) */}
          {preparingAction.originalContent && (
            <div className="border rounded-lg">
              <button
                onClick={() => setShowContext(!showContext)}
                className="w-full p-3 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span>Original Context</span>
                {showContext ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showContext && (
                <div className="px-3 pb-3">
                  <Separator className="mb-3" />
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                    <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono overflow-auto max-h-48">
                      {formatContext(preparingAction.originalContent)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Draft Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {preparingAction.type === 'meeting_prep' ? 'Prep Notes' : 'Draft Message'}
            </label>
            <Textarea
              value={preparingAction.draftContent || ''}
              onChange={handleDraftChange}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Your draft will appear here..."
            />
            <p className="text-xs text-slate-500">
              You can edit the draft before copying. Changes are not saved.
            </p>
          </div>

          {/* Alternative Drafts (if available) */}
          {preparingAction.alternativeDrafts && preparingAction.alternativeDrafts.length > 0 && (
            <div className="border rounded-lg">
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="w-full p-3 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <span>Alternative Drafts ({preparingAction.alternativeDrafts.length})</span>
                {showAlternatives ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              {showAlternatives && (
                <div className="px-3 pb-3">
                  <Separator className="mb-3" />
                  <div className="space-y-2">
                    {preparingAction.alternativeDrafts.map((alt, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={() => updatePreparedActionDraft(alt)}
                      >
                        <p className="text-xs text-slate-500 mb-1">Alternative {index + 1}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                          {alt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleClose} className="sm:mr-auto">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
          <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
          <Button onClick={handleCopyToClipboard} disabled={!preparingAction.draftContent}>
            <Copy className="w-4 h-4 mr-2" />
            Copy to Clipboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatContext(content: Record<string, any>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(content)) {
    if (value === undefined || value === null) continue;

    const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');

    if (Array.isArray(value)) {
      if (value.length > 0) {
        lines.push(`${label}:`);
        value.forEach(item => {
          if (typeof item === 'string') {
            lines.push(`  - ${item}`);
          } else {
            lines.push(`  - ${JSON.stringify(item)}`);
          }
        });
      }
    } else if (typeof value === 'object') {
      lines.push(`${label}: ${JSON.stringify(value, null, 2)}`);
    } else {
      lines.push(`${label}: ${value}`);
    }
  }

  return lines.join('\n');
}
