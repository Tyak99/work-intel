'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Github, Calendar, Mail, ExternalLink, Link2, Clock, Zap, Users, Lightbulb, Brain } from 'lucide-react';
import { useState } from 'react';
import { Todo } from '@/lib/types';

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

export function TodoSection({ todos, onToggleTodo, onAddTodo, onUpdateTodo }: TodoSectionProps) {
  const [newTodoText, setNewTodoText] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const incompleteTodos = todos.filter(todo => !todo.completed);
  const completedTodos = todos.filter(todo => todo.completed);

  const handleAddTodo = () => {
    if (newTodoText.trim()) {
      onAddTodo({
        title: newTodoText.trim(),
        completed: false,
        priority: 'medium',
        source: 'manual',
        description: '',
      });
      setNewTodoText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Smart Todo List</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {incompleteTodos.length} active
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

        {/* Active todos */}
        <div className="space-y-3">
          {incompleteTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              onUpdate={onUpdateTodo}
            />
          ))}
          
          {incompleteTodos.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No active tasks. Generate a brief or add a manual task.</p>
            </div>
          )}
        </div>

        {/* Completed todos toggle */}
        {completedTodos.length > 0 && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full justify-start text-slate-600 dark:text-slate-400"
            >
              {showCompleted ? 'Hide' : 'Show'} completed ({completedTodos.length})
            </Button>
            
            {showCompleted && (
              <div className="space-y-2 mt-3">
                {completedTodos.map((todo) => (
                  <TodoItem
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

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
}

function TodoItem({ todo, onToggle, onUpdate }: TodoItemProps) {
  const [expanded, setExpanded] = useState(false);
  const SourceIcon = sourceIcons[todo.source as keyof typeof sourceIcons];

  return (
    <div className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
      todo.completed 
        ? 'bg-slate-50 dark:bg-slate-800 opacity-75' 
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
          className="mt-0.5"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className={`font-medium text-sm ${
              todo.completed ? 'line-through text-slate-500 dark:text-slate-400' : ''
            }`}>
              {todo.title}
            </h3>
            
            <Badge 
              variant="outline"
              className={`text-xs ${priorityColors[todo.priority as keyof typeof priorityColors]}`}
            >
              {todo.priority}
            </Badge>
            
            {todo.source === 'ai-discovered' && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
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
                  <span>•</span>
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
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      correlation.confidence > 0.8 ? 'bg-green-500' : 
                      correlation.confidence > 0.6 ? 'bg-yellow-500' : 'bg-gray-500'
                    }`} />
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