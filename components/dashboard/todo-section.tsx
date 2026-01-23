'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Github,
  Calendar,
  Mail,
  ExternalLink,
  Link2,
  Clock,
  Zap,
  Users,
  Lightbulb,
  Brain,
  ChevronDown,
  ChevronRight,
  Wand2,
  Copy,
  Check,
  Loader2,
  GitPullRequest,
  CheckCircle2,
  MoreHorizontal,
  Trash2
} from 'lucide-react';
import { useState } from 'react';
import { Todo, SmartTodo } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TodoSectionProps {
  todos: Todo[];
  onToggleTodo: (id: string) => void;
  onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
  onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
}

const sourceIcons = {
  jira: Mail,
  github: Github,
  email: Mail,
  gmail: Mail,
  calendar: Calendar,
  manual: Plus,
  'ai-discovered': Brain,
};

const priorityColors = {
  critical: 'text-status-error border-status-error/30 bg-status-error-muted',
  high: 'text-status-warning border-status-warning/30 bg-status-warning-muted',
  medium: 'text-status-info border-status-info/30 bg-status-info-muted',
  low: 'text-muted-foreground border-muted-foreground/30 bg-muted/30',
};

const smartTodoTypeConfig = {
  ai_email_reply: {
    icon: Mail,
    label: 'Email Reply',
    color: 'border-action-email/30 text-action-email bg-action-email-muted',
  },
  ai_pr_nudge: {
    icon: GitPullRequest,
    label: 'PR Nudge',
    color: 'border-action-pr/30 text-action-pr bg-action-pr-muted',
  },
  ai_meeting_prep: {
    icon: Calendar,
    label: 'Meeting Prep',
    color: 'border-action-meeting/30 text-action-meeting bg-action-meeting-muted',
  },
  manual: {
    icon: Plus,
    label: 'Manual',
    color: 'border-muted-foreground/30 text-muted-foreground bg-muted/30',
  },
};

export function TodoSection({ todos, onToggleTodo, onAddTodo, onUpdateTodo }: TodoSectionProps) {
  const [newTodoText, setNewTodoText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showLegacyTodos, setShowLegacyTodos] = useState(false);
  const { t } = useTheme();

  const {
    smartTodos,
    expandedTodos,
    preparingTodoId,
    prepareTodoDraft,
    updateTodoDraft,
    copyTodoDraft,
    markTodoDone,
    toggleTodoExpanded,
    addManualSmartTodo,
  } = useDashboardStore();

  // Separate AI and manual smart todos
  const aiTodos = smartTodos.filter(t => t.type !== 'manual');
  const manualSmartTodos = smartTodos.filter(t => t.type === 'manual');

  // Separate by status
  const activeAiTodos = aiTodos.filter(t => t.status !== 'done');
  const doneAiTodos = aiTodos.filter(t => t.status === 'done');
  const activeManualTodos = manualSmartTodos.filter(t => t.status !== 'done');
  const doneManualTodos = manualSmartTodos.filter(t => t.status === 'done');

  // Legacy todos
  const incompleteTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      addManualSmartTodo(newTodoText.trim());
      setNewTodoText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  const totalActiveCount = activeAiTodos.length + activeManualTodos.length;
  const totalDoneCount = doneAiTodos.length + doneManualTodos.length;

  return (
    <Card className="h-full flex flex-col glass-panel border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t('todoTitle')}</CardTitle>
          <Badge variant="secondary" className="bg-primary/20 text-primary font-mono text-xs">
            {totalActiveCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
        {/* Add new todo */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={t('addTaskPlaceholder')}
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="text-sm bg-card border-border focus-visible:ring-primary/50"
          />
          <Button
            onClick={handleAddTodo}
            size="icon"
            className="bg-primary hover:bg-primary/80 shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* AI-Actionable Todos Section */}
        {activeAiTodos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">
                {t('aiActionItems')}
              </h3>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                {activeAiTodos.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {activeAiTodos.map((todo) => (
                <SmartTodoItem
                  key={todo.id}
                  todo={todo}
                  isExpanded={expandedTodos.has(todo.id)}
                  isPreparing={preparingTodoId === todo.id}
                  onToggleExpand={() => toggleTodoExpanded(todo.id)}
                  onPrepare={() => prepareTodoDraft(todo.id)}
                  onUpdateDraft={(content) => updateTodoDraft(todo.id, content)}
                  onCopy={() => copyTodoDraft(todo.id)}
                  onMarkDone={() => markTodoDone(todo.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Manual Todos Section */}
        {activeManualTodos.length > 0 && (
          <div className="space-y-3">
            {activeAiTodos.length > 0 && (
              <Separator className="my-4 bg-border" />
            )}
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">
                {t('manualTasks')}
              </h3>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                {activeManualTodos.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {activeManualTodos.map((todo) => (
                <ManualSmartTodoItem
                  key={todo.id}
                  todo={todo}
                  onMarkDone={() => markTodoDone(todo.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalActiveCount === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">{t('emptyTodos')}</p>
            <p className="text-xs mt-1">{t('emptyTodosSubtext')}</p>
          </div>
        )}

        {/* Completed todos toggle */}
        {totalDoneCount > 0 && (
          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
            >
              {showCompleted ? t('hideCompleted') : t('showCompleted')} ({totalDoneCount})
            </Button>

            {showCompleted && (
              <div className="space-y-2 mt-3 opacity-60">
                {doneAiTodos.map((todo) => (
                  <SmartTodoItem
                    key={todo.id}
                    todo={todo}
                    isExpanded={expandedTodos.has(todo.id)}
                    isPreparing={false}
                    onToggleExpand={() => toggleTodoExpanded(todo.id)}
                    onPrepare={() => {}}
                    onUpdateDraft={() => {}}
                    onCopy={() => copyTodoDraft(todo.id)}
                    onMarkDone={() => {}}
                  />
                ))}
                {doneManualTodos.map((todo) => (
                  <ManualSmartTodoItem
                    key={todo.id}
                    todo={todo}
                    onMarkDone={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SmartTodoItemProps {
  todo: SmartTodo;
  isExpanded: boolean;
  isPreparing: boolean;
  onToggleExpand: () => void;
  onPrepare: () => void;
  onUpdateDraft: (content: string) => void;
  onCopy: () => void;
  onMarkDone: () => void;
}

function SmartTodoItem({
  todo,
  isExpanded,
  isPreparing,
  onToggleExpand,
  onPrepare,
  onUpdateDraft,
  onCopy,
  onMarkDone,
}: SmartTodoItemProps) {
  const { t } = useTheme();
  const config = smartTodoTypeConfig[todo.type] || smartTodoTypeConfig.manual;
  const Icon = config.icon;
  const isDone = todo.status === 'done';
  const isReady = todo.status === 'ready';
  const isPending = todo.status === 'pending';
  const isPreparingStatus = todo.status === 'preparing';

  return (
    <div
      className={cn(
        "group rounded-lg border transition-all duration-300",
        isDone 
          ? "bg-muted/30 border-border opacity-60" 
          : "glass-panel-hover bg-card/40 backdrop-blur-sm border-border",
        isExpanded && !isDone ? "ring-1 ring-primary/30 bg-primary/5" : ""
      )}
    >
      {/* Collapsed header - always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full p-3 flex items-start gap-3 text-left"
      >
        <div className={cn("p-1.5 rounded shrink-0 mt-0.5 border bg-opacity-10", config.color)}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={cn(
                "font-medium text-sm transition-colors",
                isDone ? "text-muted-foreground line-through decoration-muted-foreground" : "text-foreground"
              )}
            >
              {todo.title}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className={cn("text-[10px] uppercase h-5 font-mono", config.color)}>
              {config.label}
            </Badge>
            {todo.priority && (
              <Badge
                variant="outline"
                className={cn("text-[10px] uppercase h-5 font-mono", priorityColors[todo.priority])}
              >
                {todo.priority}
              </Badge>
            )}
            {/* Status badges */}
            {isDone && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-status-success-muted text-status-success border-status-success/20">
                <Check className="w-3 h-3 mr-1" />
                DONE
              </Badge>
            )}
            {isReady && !isDone && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-status-info-muted text-status-info border-status-info/20">
                <Check className="w-3 h-3 mr-1" />
                READY
              </Badge>
            )}
            {isPreparingStatus && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-status-warning-muted text-status-warning border-status-warning/20">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                PREPARING...
              </Badge>
            )}
          </div>
        </div>

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 space-y-3 animate-accordion-down">
          <Separator className="bg-border" />

          {/* Draft content area */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {todo.type === 'ai_meeting_prep' ? t('prepNotesLabel') : t('draftLabel')}
            </label>

            {isPending && !todo.draftContent && (
              <div className="p-4 bg-muted/20 rounded-lg border border-dashed border-border text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  Click below to generate a draft.
                </p>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrepare();
                  }}
                  disabled={isPreparing || isPreparingStatus}
                  className="h-7 text-xs"
                >
                  {isPreparing || isPreparingStatus ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-2" />
                  )}
                  {t('prepareButton')}
                </Button>
              </div>
            )}

            {isPreparingStatus && (
              <div className="p-4 bg-muted/20 rounded-lg border border-border text-center">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-xs text-primary animate-pulse">
                  {t('generatingBrief')}
                </p>
              </div>
            )}

            {(isReady || isDone || todo.draftContent) && !isPreparingStatus && (
              <>
                <Textarea
                  value={todo.draftContent || ''}
                  onChange={(e) => onUpdateDraft(e.target.value)}
                  className="min-h-[150px] text-xs bg-muted/40 border-border focus-visible:ring-primary/50 text-foreground"
                  placeholder="Draft content..."
                  disabled={isDone}
                />
              </>
            )}
          </div>

          {/* Action buttons */}
          {!isDone && (
            <div className="flex flex-wrap gap-2">
              {isPending && !todo.draftContent && !isPreparingStatus && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrepare();
                  }}
                  disabled={isPreparing || isPreparingStatus}
                  className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isPreparing || isPreparingStatus ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-2" />
                  )}
                  {t('prepareButton')}
                </Button>
              )}

              {(isReady || todo.draftContent) && !isPreparingStatus && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrepare();
                    }}
                    disabled={isPreparing || isPreparingStatus}
                    className="h-7 text-xs"
                  >
                    <Wand2 className="w-3 h-3 mr-2" />
                    {t('regenerateButton')}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy();
                    }}
                    disabled={!todo.draftContent}
                    className="h-7 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    {t('copyButton')}
                  </Button>

                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone();
                    }}
                    className="h-7 text-xs bg-primary hover:bg-primary/80"
                  >
                    <Check className="w-3 h-3 mr-2" />
                    {t('completeButton')}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Original context (collapsible) */}
          {todo.originalContext && Object.keys(todo.originalContext).length > 0 && (
            <details className="text-[10px] group/details">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ChevronRight className="w-3 h-3 group-open/details:rotate-90 transition-transform" />
                View source data
              </summary>
              <pre className="mt-2 p-2 bg-muted/40 rounded border border-border text-muted-foreground overflow-auto max-h-32 font-mono">
                {JSON.stringify(todo.originalContext, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

interface ManualSmartTodoItemProps {
  todo: SmartTodo;
  onMarkDone: () => void;
}

function ManualSmartTodoItem({ todo, onMarkDone }: ManualSmartTodoItemProps) {
  const isDone = todo.status === 'done';

  return (
    <div
      className={cn(
        "border rounded-lg p-3 transition-all duration-200",
        isDone
          ? "bg-muted/30 border-border opacity-60"
          : "glass-panel-hover bg-card/40 backdrop-blur-sm border-border hover:border-muted-foreground/50 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => !isDone && onMarkDone()}
          disabled={isDone}
          className="border-muted-foreground data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
        />
        <span
          className={cn(
            "flex-1 text-sm transition-colors",
            isDone ? "line-through text-muted-foreground decoration-muted-foreground" : "text-foreground"
          )}
        >
          {todo.title}
        </span>
        {isDone && (
          <Badge variant="secondary" className="text-[10px] h-5 bg-status-success-muted text-status-success border-status-success/20 font-mono">
            <Check className="w-3 h-3 mr-1" />
            DONE
          </Badge>
        )}
      </div>
    </div>
  );
}
