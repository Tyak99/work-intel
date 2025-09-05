'use client';

import { useState, useEffect } from 'react';
import { Header } from './header';
import { BriefSection } from './brief-section';
import { TodoSection } from './todo-section';
import { StatusBar } from './status-bar';
import { SettingsModal } from './settings-modal';
import { useDashboardStore } from '@/lib/store';

export function Dashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { 
    isGeneratingBrief, 
    brief, 
    todos, 
    toolStatus,
    generateDailyBrief,
    addTodo,
    toggleTodo,
    updateTodo
  } = useDashboardStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-6 py-8">
        <Header 
          onGenerateBrief={generateDailyBrief}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isGenerating={isGeneratingBrief}
        />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2">
            <BriefSection 
              brief={brief}
              isGenerating={isGeneratingBrief}
            />
          </div>
          
          <div>
            <TodoSection 
              todos={todos}
              onToggleTodo={toggleTodo}
              onAddTodo={addTodo}
              onUpdateTodo={updateTodo}
            />
          </div>
        </div>

        <StatusBar toolStatus={toolStatus} />
        
        <SettingsModal 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
}