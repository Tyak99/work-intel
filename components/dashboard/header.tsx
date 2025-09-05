'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, Settings, Brain } from 'lucide-react';

interface HeaderProps {
  onGenerateBrief: () => void;
  onOpenSettings: () => void;
  isGenerating: boolean;
}

export function Header({ onGenerateBrief, onOpenSettings, isGenerating }: HeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Work Intelligence
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            AI-powered productivity command center
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <Button 
          onClick={onGenerateBrief}
          disabled={isGenerating}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          {isGenerating ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Generating...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Generate Brief</span>
            </div>
          )}
        </Button>
        
        <Button 
          variant="outline"
          size="lg"
          onClick={onOpenSettings}
          className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </header>
  );
}