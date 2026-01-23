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
    fetchLatestBrief,
    fetchTasks,
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
        // User is authenticated, load existing data and refresh tool status
        fetchLatestBrief();
        fetchTasks();
        refreshToolStatus();
      }
    });
  }, [fetchCurrentUser, fetchLatestBrief, fetchTasks, refreshToolStatus]);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur animate-pulse"></div>
            <div className="relative h-12 w-12 rounded-full border-2 border-primary/50 border-t-transparent animate-spin"></div>
          </div>
          <p className="font-mono text-sm text-primary animate-pulse tracking-widest uppercase">Initializing Command Center...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, redirect will be handled by middleware
  // But we show a fallback just in case
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground font-mono">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 font-sans relative overflow-x-hidden">
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none z-0 animate-pulse-glow" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px] pointer-events-none z-0 animate-pulse-glow" style={{ animationDelay: '1s' }} />
      
      <Header 
        onGenerateBrief={generateDailyBrief}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isGenerating={isGeneratingBrief}
      />
      
      <main className="container mx-auto px-4 pt-6 pb-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6rem)]">
          {/* Brief Column - Main Feed */}
          <div className="lg:col-span-8 h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
            <BriefSection 
              brief={brief}
              isGenerating={isGeneratingBrief}
            />
          </div>
          
          {/* Tasks Column - Sidebar */}
          <div className="lg:col-span-4 h-full overflow-hidden pb-10">
            <TodoSection 
              todos={todos}
              onToggleTodo={toggleTodo}
              onAddTodo={addTodo}
              onUpdateTodo={updateTodo}
            />
          </div>
        </div>
      </main>
      
      <StatusBar toolStatus={toolStatus} />
      
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
