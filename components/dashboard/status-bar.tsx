'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Github, Calendar, Mail } from 'lucide-react';
import { ToolStatus } from '@/lib/types';

interface StatusBarProps {
  toolStatus: Record<string, ToolStatus>;
}

const toolIcons = {
  jira: Mail,
  github: Github,
  gmail: Mail,
  calendar: Calendar,
};

const statusColors = {
  connected: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  disconnected: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  syncing: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export function StatusBar({ toolStatus }: StatusBarProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:w-auto">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tool Status:
            </span>
            
            <div className="flex items-center space-x-2">
              {Object.entries(toolStatus).map(([tool, status]) => {
                const Icon = toolIcons[tool as keyof typeof toolIcons];
                return (
                  <div key={tool} className="flex items-center space-x-1">
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    <Badge 
                      variant="outline"
                      className={`text-xs ${statusColors[status.status as keyof typeof statusColors]}`}
                    >
                      {status.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRefresh}
            className="shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Last sync: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}