'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './header';
import { BriefSection } from './brief-section';
import { TodoSection } from './todo-section';
import { StatusBar } from './status-bar';
import { SettingsModal } from './settings-modal';
import { useDashboardStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

export function Dashboard() {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    user,
    isLoadingUser,
    fetchCurrentUser,
    isGeneratingBrief,
    brief,
    todos,
    toolStatus,
    generateDailyBrief,
    addTodo,
    toggleTodo,
    updateTodo,
    refreshToolStatus,
  } = useDashboardStore();

  // Fetch current user on mount
  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user) {
        // User is authenticated, refresh tool status
        refreshToolStatus();
      }
    });
  }, [fetchCurrentUser, refreshToolStatus]);

  useEffect(() => {
    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const authResult = params.get('auth');

    if (authResult) {
      if (authResult === 'success') {
        const email = params.get('email');
        const provider = params.get('provider');
        toast.success(`Successfully connected ${email} via ${provider}!`);
        refreshToolStatus();
      } else if (authResult === 'error') {
        const message = params.get('message');
        toast.error(message || 'Authentication failed');
      }

      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refreshToolStatus]);

  // Show loading state while checking auth
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, redirect will be handled by middleware
  // But we show a fallback just in case
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-600 dark:text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

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