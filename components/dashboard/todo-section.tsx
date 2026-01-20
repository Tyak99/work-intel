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
} from 'lucide-react';
import { useState } from 'react';
import { Todo, SmartTodo } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';

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
  critical: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
};

const smartTodoTypeConfig = {
  ai_email_reply: {
    icon: Mail,
    label: 'Email Reply',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  ai_pr_nudge: {
    icon: GitPullRequest,
    label: 'PR Nudge',
    color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  },
  ai_meeting_prep: {
    icon: Calendar,
    label: 'Meeting Prep',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  manual: {
    icon: Plus,
    label: 'Manual',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
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
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Smart Todo List</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {totalActiveCount} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new todo */}
        <div className="flex space-x-2">
          <Input
            placeholder="Add a manual task..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button
            onClick={handleAddTodo}
            size="sm"
            className="shrink-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* AI-Actionable Todos Section */}
        {activeAiTodos.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                AI-Actionable Items
              </h3>
              <Badge variant="outline" className="text-xs">
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
              <Separator className="my-4" />
            )}
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Manual Tasks
              </h3>
              <Badge variant="outline" className="text-xs">
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
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active tasks. Generate a brief to get AI-actionable items.</p>
          </div>
        )}

        {/* Completed todos toggle */}
        {totalDoneCount > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full justify-start text-slate-600 dark:text-slate-400"
            >
              {showCompleted ? 'Hide' : 'Show'} completed ({totalDoneCount})
            </Button>

            {showCompleted && (
              <div className="space-y-2 mt-3">
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

        {/* Legacy todos section (collapsed by default) */}
        {(incompleteTodos.length > 0 || completedTodos.length > 0) && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLegacyTodos(!showLegacyTodos)}
              className="w-full justify-start text-slate-600 dark:text-slate-400"
            >
              {showLegacyTodos ? 'Hide' : 'Show'} brief-extracted tasks ({incompleteTodos.length + completedTodos.length})
            </Button>

            {showLegacyTodos && (
              <div className="space-y-2 mt-3">
                {incompleteTodos.map((todo) => (
                  <LegacyTodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggleTodo}
                    onUpdate={onUpdateTodo}
                  />
                ))}
                {completedTodos.map((todo) => (
                  <LegacyTodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggleTodo}
                    onUpdate={onUpdateTodo}
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
      className={`border rounded-lg transition-all duration-200 ${
        isDone
          ? 'bg-slate-50 dark:bg-slate-800 opacity-75 border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-md'
      }`}
    >
      {/* Collapsed header - always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full p-4 flex items-start gap-3 text-left"
      >
        <div className={`p-1.5 rounded ${config.color} shrink-0 mt-0.5`}>
          <Icon className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4
              className={`font-medium text-sm ${
                isDone ? 'line-through text-slate-500 dark:text-slate-400' : ''
              }`}
            >
              {todo.title}
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline" className={`text-xs ${config.color}`}>
              {config.label}
            </Badge>
            {todo.priority && (
              <Badge
                variant="outline"
                className={`text-xs ${priorityColors[todo.priority] || ''}`}
              >
                {todo.priority}
              </Badge>
            )}
            {/* Status badges */}
            {isDone && (
              <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400">
                <Check className="w-3 h-3 mr-1" />
                Done
              </Badge>
            )}
            {isReady && !isDone && (
              <Badge variant="secondary" className="text-xs text-blue-600 dark:text-blue-400">
                <Check className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            )}
            {isPreparingStatus && (
              <Badge variant="secondary" className="text-xs text-amber-600 dark:text-amber-400">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Preparing...
              </Badge>
            )}
          </div>
        </div>

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <Separator />

          {/* Draft content area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {todo.type === 'ai_meeting_prep' ? 'Prep Notes' : 'Draft Message'}
            </label>

            {isPending && !todo.draftContent && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  No draft yet. Click "Prepare" to generate one.
                </p>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrepare();
                  }}
                  disabled={isPreparing || isPreparingStatus}
                >
                  {isPreparing || isPreparingStatus ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Prepare Draft
                </Button>
              </div>
            )}

            {isPreparingStatus && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Generating draft...
                </p>
              </div>
            )}

            {(isReady || isDone || todo.draftContent) && !isPreparingStatus && (
              <>
                <Textarea
                  value={todo.draftContent || ''}
                  onChange={(e) => onUpdateDraft(e.target.value)}
                  className="min-h-[150px] font-mono text-sm"
                  placeholder="Your draft will appear here..."
                  disabled={isDone}
                />
                <p className="text-xs text-slate-500">
                  You can edit the draft before copying.
                </p>
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
                >
                  {isPreparing || isPreparingStatus ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Prepare
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
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopy();
                    }}
                    disabled={!todo.draftContent}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>

                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkDone();
                    }}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Done
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Original context (collapsible) */}
          {todo.originalContext && Object.keys(todo.originalContext).length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                View original context
              </summary>
              <pre className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400 overflow-auto max-h-32">
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
      className={`border rounded-lg p-4 transition-all duration-200 ${
        isDone
          ? 'bg-slate-50 dark:bg-slate-800 opacity-75'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isDone}
          onCheckedChange={() => !isDone && onMarkDone()}
          disabled={isDone}
        />
        <span
          className={`flex-1 text-sm ${
            isDone ? 'line-through text-slate-500 dark:text-slate-400' : ''
          }`}
        >
          {todo.title}
        </span>
        {isDone && (
          <Badge variant="secondary" className="text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3 mr-1" />
            Done
          </Badge>
        )}
      </div>
    </div>
  );
}

// Legacy TodoItem component for backward compatibility
interface LegacyTodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
}

function LegacyTodoItem({ todo, onToggle, onUpdate }: LegacyTodoItemProps) {
  const SourceIcon = sourceIcons[todo.source as keyof typeof sourceIcons];

  return (
    <div
      className={`border rounded-lg p-4 transition-all duration-200 ${
        todo.completed
          ? 'bg-slate-50 dark:bg-slate-800 opacity-75'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          className="mt-0.5"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3
              className={`font-medium text-sm ${
                todo.completed ? 'line-through text-slate-500 dark:text-slate-400' : ''
              }`}
            >
              {todo.title}
            </h3>

            <Badge
              variant="outline"
              className={`text-xs ${priorityColors[todo.priority as keyof typeof priorityColors]}`}
            >
              {todo.priority}
            </Badge>

            {todo.source === 'ai-discovered' && (
              <Badge
                variant="outline"
                className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
              >
                <Brain className="w-3 h-3 mr-1" />
                AI Found
              </Badge>
            )}
          </div>

          {/* Enhanced metadata row */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mb-2">
            <div className="flex items-center space-x-1">
              <SourceIcon className="w-3 h-3" />
              <span className="capitalize">{todo.source}</span>
              {todo.sourceId && (
                <>
                  <span>-</span>
                  <span>{todo.sourceId}</span>
                </>
              )}
            </div>

            {todo.effort && (
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {todo.effort}
              </Badge>
            )}

            {todo.deadline && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {todo.deadline}
              </Badge>
            )}

            {todo.blockingImpact && (
              <Badge variant="outline" className="text-xs text-orange-700 dark:text-orange-300">
                <Users className="w-3 h-3 mr-1" />
                {todo.blockingImpact}
              </Badge>
            )}
          </div>

          {todo.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              {todo.description}
            </p>
          )}

          {/* Correlations */}
          {todo.correlations && todo.correlations.length > 0 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                <Link2 className="w-3 h-3 mr-1" />
                Related Items
              </p>
              <div className="space-y-1">
                {todo.correlations.slice(0, 2).map((correlation, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        correlation.confidence > 0.8
                          ? 'bg-green-500'
                          : correlation.confidence > 0.6
                          ? 'bg-yellow-500'
                          : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-slate-600 dark:text-slate-400">
                      {correlation.relatedSource}: {correlation.relatedId}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {todo.aiInsights && (
            <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/30 rounded border border-indigo-200 dark:border-indigo-800 mb-2">
              <div className="flex items-start space-x-2">
                <Lightbulb className="w-3 h-3 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-indigo-800 dark:text-indigo-200">{todo.aiInsights}</p>
              </div>
            </div>
          )}

          {todo.dueDate && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Due: {todo.dueDate.toLocaleDateString()}
            </p>
          )}
        </div>

        {todo.url && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(todo.url, '_blank')}
            className="shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
