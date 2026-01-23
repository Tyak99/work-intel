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
  critical: 'text-red-400 border-red-400/30 bg-red-400/10',
  high: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  medium: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  low: 'text-slate-400 border-slate-400/30 bg-slate-400/10',
};

const smartTodoTypeConfig = {
  ai_email_reply: {
    icon: Mail,
    label: 'Email Reply',
    color: 'border-emerald-400/30 text-emerald-400 bg-emerald-400/10',
  },
  ai_pr_nudge: {
    icon: GitPullRequest,
    label: 'PR Nudge',
    color: 'border-violet-400/30 text-violet-400 bg-violet-400/10',
  },
  ai_meeting_prep: {
    icon: Calendar,
    label: 'Meeting Prep',
    color: 'border-blue-400/30 text-blue-400 bg-blue-400/10',
  },
  manual: {
    icon: Plus,
    label: 'Manual',
    color: 'border-slate-400/30 text-slate-400 bg-slate-400/10',
  },
};

export function TodoSection({ todos, onToggleTodo, onAddTodo, onUpdateTodo }: TodoSectionProps) {
  const [newTodoText, setNewTodoText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);
  const [showLegacyTodos, setShowLegacyTodos] = useState(false);

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
    <Card className="h-full flex flex-col glass-panel border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">ACTIVE TASKS</CardTitle>
          <Badge variant="secondary" className="bg-primary/20 text-primary font-mono text-xs">
            {totalActiveCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4 space-y-4 custom-scrollbar">
        {/* Add new todo */}
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="ENTER TASK OBJECTIVE..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="font-mono text-sm bg-black/30 border-primary/30 focus-visible:ring-primary/50"
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
              <Brain className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-slate-300 font-mono">
                AI ACTION ITEMS
              </h3>
              <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">
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
              <Separator className="my-4 bg-white/5" />
            )}
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-medium text-slate-300 font-mono">
                MANUAL TASKS
              </h3>
              <Badge variant="outline" className="text-[10px] border-slate-500/30 text-slate-400">
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
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
              <CheckCircle2 className="h-6 w-6 text-slate-500" />
            </div>
            <p className="font-mono text-sm">ALL SYSTEMS NOMINAL.</p>
            <p className="text-xs mt-1 text-slate-600">No active tasks pending.</p>
          </div>
        )}

        {/* Completed todos toggle */}
        {totalDoneCount > 0 && (
          <div className="pt-4 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full justify-start text-slate-400 hover:text-slate-300 font-mono text-xs"
            >
              {showCompleted ? '[HIDE]' : '[SHOW]'} COMPLETED ({totalDoneCount})
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
          ? "bg-slate-900/30 border-white/5 opacity-60" 
          : "bg-background/40 backdrop-blur-sm border-white/10 hover:border-primary/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.05)]",
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
                isDone ? "text-muted-foreground line-through decoration-slate-600" : "text-slate-200 group-hover:text-white"
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
              <Badge variant="secondary" className="text-[10px] h-5 bg-green-500/10 text-green-400 border-green-500/20">
                <Check className="w-3 h-3 mr-1" />
                DONE
              </Badge>
            )}
            {isReady && !isDone && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-blue-500/10 text-blue-400 border-blue-500/20">
                <Check className="w-3 h-3 mr-1" />
                READY
              </Badge>
            )}
            {isPreparingStatus && (
              <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/10 text-amber-400 border-amber-500/20">
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
          <Separator className="bg-white/5" />

          {/* Draft content area */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-400 uppercase tracking-wide">
              {todo.type === 'ai_meeting_prep' ? 'Prep Notes' : 'Draft Payload'}
            </label>

            {isPending && !todo.draftContent && (
              <div className="p-4 bg-black/20 rounded-lg border border-dashed border-white/10 text-center">
                <p className="text-xs text-slate-400 mb-3 font-mono">
                  Awaiting draft generation.
                </p>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrepare();
                  }}
                  disabled={isPreparing || isPreparingStatus}
                  className="h-7 text-xs font-mono"
                >
                  {isPreparing || isPreparingStatus ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-2" />
                  )}
                  INITIATE DRAFT
                </Button>
              </div>
            )}

            {isPreparingStatus && (
              <div className="p-4 bg-black/20 rounded-lg border border-white/10 text-center">
                <Loader2 className="w-5 h-5 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-xs text-primary font-mono animate-pulse">
                  GENERATING CONTENT...
                </p>
              </div>
            )}

            {(isReady || isDone || todo.draftContent) && !isPreparingStatus && (
              <>
                <Textarea
                  value={todo.draftContent || ''}
                  onChange={(e) => onUpdateDraft(e.target.value)}
                  className="min-h-[150px] font-mono text-xs bg-black/40 border-white/10 focus-visible:ring-primary/50 text-slate-300"
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
                  className="h-7 text-xs font-mono border-primary/30 text-primary hover:bg-primary/10"
                >
                  {isPreparing || isPreparingStatus ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-2" />
                  )}
                  PREPARE
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
                    className="h-7 text-xs font-mono"
                  >
                    <Wand2 className="w-3 h-3 mr-2" />
                    REGENERATE
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy();
                    }}
                    disabled={!todo.draftContent}
                    className="h-7 text-xs font-mono"
                  >
                    <Copy className="w-3 h-3 mr-2" />
                    COPY
                  </Button>

                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone();
                    }}
                    className="h-7 text-xs font-mono bg-primary hover:bg-primary/80"
                  >
                    <Check className="w-3 h-3 mr-2" />
                    COMPLETE
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Original context (collapsible) */}
          {todo.originalContext && Object.keys(todo.originalContext).length > 0 && (
            <details className="text-[10px] font-mono group/details">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-300 flex items-center gap-1">
                <ChevronRight className="w-3 h-3 group-open/details:rotate-90 transition-transform" />
                VIEW SOURCE DATA
              </summary>
              <pre className="mt-2 p-2 bg-black/40 rounded border border-white/5 text-slate-400 overflow-auto max-h-32">
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
          ? "bg-slate-900/30 border-white/5 opacity-60"
          : "bg-background/40 backdrop-blur-sm border-white/10 hover:border-slate-600 hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => !isDone && onMarkDone()}
          disabled={isDone}
          className="border-slate-500 data-[state=checked]:bg-slate-500 data-[state=checked]:border-slate-500"
        />
        <span
          className={cn(
            "flex-1 text-sm transition-colors",
            isDone ? "line-through text-muted-foreground decoration-slate-600" : "text-slate-300"
          )}
        >
          {todo.title}
        </span>
        {isDone && (
          <Badge variant="secondary" className="text-[10px] h-5 bg-green-500/10 text-green-400 border-green-500/20 font-mono">
            <Check className="w-3 h-3 mr-1" />
            DONE
          </Badge>
        )}
      </div>
    </div>
  );
}
