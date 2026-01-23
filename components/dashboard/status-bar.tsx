'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Github, Calendar, Mail, CheckCircle2, WifiOff, AlertCircle } from 'lucide-react';
import { ToolStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface StatusBarProps {
  toolStatus: Record<string, ToolStatus>;
}

const toolIcons = {
  jira: Mail,
  github: Github,
  gmail: Mail,
  calendar: Calendar,
};

export function StatusBar({ toolStatus }: StatusBarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  const getStatusColor = (status: 'connected' | 'disconnected' | 'error' | 'syncing') => {
    switch (status) {
      case 'connected': return 'text-status-success bg-status-success-muted border-status-success/30';
      case 'disconnected': return 'text-muted-foreground bg-muted/50 border-muted-foreground/30';
      case 'error': return 'text-status-error bg-status-error-muted border-status-error/30';
      case 'syncing': return 'text-status-warning bg-status-warning-muted border-status-warning/30';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: 'connected' | 'disconnected' | 'error' | 'syncing') => {
    switch (status) {
      case 'connected': return <CheckCircle2 className="w-3 h-3" />;
      case 'disconnected': return <WifiOff className="w-3 h-3" />;
      case 'error': return <AlertCircle className="w-3 h-3" />;
      case 'syncing': return <RefreshCw className="w-3 h-3 animate-spin" />;
      default: return <WifiOff className="w-3 h-3" />;
    }
  };

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 bg-card/95 backdrop-blur-md border-t border-border flex items-center justify-between px-4 z-50">
      <div className="flex items-center space-x-4">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider hidden sm:inline-block">
          System Status:
        </span>
        
        <div className="flex items-center space-x-2">
          {Object.entries(toolStatus).map(([tool, status]) => (
            <div 
              key={tool} 
              className={cn(
                "flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-all",
                getStatusColor(status.status as any)
              )}
            >
              {getStatusIcon(status.status as any)}
              <span className="capitalize">{tool}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline-block">
          Last Sync: {new Date().toLocaleTimeString()}
        </span>
        
        <button 
          onClick={handleRefresh}
          className={cn(
            "text-primary hover:text-primary-glow transition-colors p-1",
            isRefreshing && "animate-spin"
          )}
          title="Refresh Status"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
