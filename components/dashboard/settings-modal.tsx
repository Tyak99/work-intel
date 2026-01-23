'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, Calendar, Mail, Settings, CheckCircle, XCircle, Loader2, Activity, Zap, Monitor, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/lib/store';
import { useTheme } from '@/components/theme-provider';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tools = [
  {
    id: 'jira',
    name: 'JIRA UPLINK',
    icon: Activity,
    description: 'Establish connection to Jira issue tracking protocol',
    authType: 'token',
    color: 'neon-amber',
  },
  {
    id: 'github',
    name: 'GITHUB REPO',
    icon: Github,
    description: 'Sync with version control and PR systems',
    authType: 'token',
    color: 'neon-purple',
  },
  {
    id: 'gmail',
    name: 'COMMS ARRAY',
    icon: Mail,
    description: 'Monitor secure communication channels (Gmail)',
    authType: 'oauth',
    color: 'neon-green',
  },
  {
    id: 'calendar',
    name: 'CHRONO SYNC',
    icon: Calendar,
    description: 'Synchronize temporal events and schedules',
    authType: 'oauth',
    color: 'neon-blue',
  },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [tokens, setTokens] = useState<Record<string, any>>({});
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const { toolStatus, refreshToolStatus } = useDashboardStore();
  const { themeId, setTheme, theme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      refreshToolStatus();
    }
  }, [isOpen, refreshToolStatus]);

  const handleTokenChange = (toolId: string, field: string, value: string) => {
    setTokens(prev => ({ 
      ...prev, 
      [toolId]: { ...prev[toolId], [field]: value }
    }));
  };

  const handleConnect = async (toolId: string) => {
    setConnecting(prev => ({ ...prev, [toolId]: true }));
    
    try {
      const credentials = tokens[toolId] || {};
      
      const response = await fetch('/api/tools/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user-1', // TODO: Get from auth context
          toolType: toolId,
          credentials
        })
      });

      const result = await response.json();
      
      if (result.success) {
        await refreshToolStatus();
        setTokens(prev => ({ ...prev, [toolId]: {} })); // Clear tokens after successful connection
        toast.success(`Connection established: ${toolId}`);
      } else {
        toast.error(`Connection failed: ${result.message}`);
      }
    } catch (error) {
      toast.error(`Error connecting to ${toolId}. Check credentials.`);
    } finally {
      setConnecting(prev => ({ ...prev, [toolId]: false }));
    }
  };

  const handleTestConnection = async (toolId: string) => {
    setTesting(prev => ({ ...prev, [toolId]: true }));
    
    try {
      await refreshToolStatus();
      const status = toolStatus[toolId];
      if (status?.status === 'connected') {
        toast.success(`${toolId} signal strength: 100%`);
      } else if (status?.status === 'error') {
        toast.error(`${toolId} connection error: ${status.error}`);
      } else {
        toast.error(`${toolId} offline`);
      }
    } catch (error) {
      toast.error(`Diagnostic failed for ${toolId}`);
    } finally {
      setTesting(prev => ({ ...prev, [toolId]: false }));
    }
  };

  const handleOAuthConnect = async (toolId: string) => {
    if (toolId === 'gmail' || toolId === 'calendar') {
      // Both Gmail and Calendar use the same Nylas OAuth flow
      setConnecting(prev => ({ ...prev, gmail: true, calendar: true }));

      try {
        const response = await fetch('/api/tools/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-1', // TODO: Get from auth context
            toolType: 'nylas',
            credentials: {}
          })
        });

        const result = await response.json();

        if (result.success && result.authUrl) {
          // Redirect to Nylas OAuth
          window.location.href = result.authUrl;
        } else {
          toast.error('Auth initiation failed');
        }
      } catch (error) {
        toast.error('Error initiating OAuth sequence');
      } finally {
        setConnecting(prev => ({ ...prev, gmail: false, calendar: false }));
      }
    } else {
      toast.error('Protocol not implemented');
    }
  };

  const handleDisconnect = async (toolId: string) => {
    if (toolId === 'gmail' || toolId === 'calendar') {
      try {
        const response = await fetch('/api/auth/nylas/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-1' })
        });

        if (response.ok) {
          await refreshToolStatus();
          toast.success('Disconnection successful');
        } else {
          toast.error('Disconnection failed');
        }
      } catch (error) {
        toast.error('Error executing disconnect');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] w-full sm:max-w-2xl bg-card/95 backdrop-blur-xl border border-border text-foreground p-0 overflow-hidden shadow-lg my-4 max-h-[calc(100vh-4rem)] flex flex-col">
        <DialogHeader className="p-6 border-b border-border bg-muted/40 shrink-0">
          <DialogTitle className="flex items-center space-x-3 text-xl font-display font-bold tracking-widest uppercase">
            <Settings className="w-5 h-5 text-primary animate-spin-slow" />
            <span className="text-glow">System Configuration</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <div className="space-y-3">
             <h3 className="text-sm font-bold font-display uppercase tracking-wide text-muted-foreground">Interface Theme</h3>
             <div className="grid grid-cols-2 gap-3">
               <button
                 onClick={() => setTheme('future')}
                 className={cn(
                   "flex items-center justify-center space-x-2 p-3 rounded-md border transition-all duration-300",
                   themeId === 'future' 
                     ? "bg-primary/20 border-primary text-primary shadow-glow-sm" 
                     : "bg-muted/40 border-border text-muted-foreground hover:bg-muted/60"
                 )}
               >
                 <Sparkles className="w-4 h-4" />
                 <span className="text-xs font-mono font-bold uppercase">Dark Future</span>
               </button>
               <button
                 onClick={() => setTheme('original')}
                 className={cn(
                   "flex items-center justify-center space-x-2 p-3 rounded-md border transition-all duration-300",
                   themeId === 'original' 
                     ? "bg-primary/20 border-primary text-primary shadow-glow-sm" 
                     : "bg-muted/40 border-border text-muted-foreground hover:bg-muted/60"
                 )}
               >
                 <Monitor className="w-4 h-4" />
                 <span className="text-xs font-mono font-bold uppercase">Original</span>
               </button>
             </div>
          </div>

          <div className="h-px bg-border my-4" />

          <p className="text-sm font-mono text-muted-foreground border-l-2 border-primary/50 pl-3">
            ESTABLISH UPLINKS TO EXTERNAL DATA STREAMS FOR ANALYSIS.
          </p>
          
          <div className="grid gap-4">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const status = toolStatus[tool.id];
              const isConnected = status?.status === 'connected';
              const hasError = status?.status === 'error';
              const isConnecting = connecting[tool.id];
              const isTesting = testing[tool.id];
              
              return (
                <div key={tool.id} className={cn(
                  "relative overflow-hidden rounded-lg border transition-all duration-300 group",
                  isConnected 
                    ? "bg-primary/5 border-primary/30 shadow-glow-sm" 
                    : "bg-muted/40 border-border hover:border-muted-foreground/30"
                )}>
                  {isConnected && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />}
                  
                  <div className="p-4 relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={cn("p-2 rounded bg-muted/50 border border-border", isConnected ? "text-primary" : "text-muted-foreground")}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold font-display tracking-wide uppercase">{tool.name}</h3>
                          <div className="flex items-center mt-1 gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isConnected ? "bg-green-500" : hasError ? "bg-red-500" : "bg-muted-foreground/50")} />
                             <span className="text-[10px] font-mono uppercase text-muted-foreground">
                               {isConnecting ? 'HANDSHAKING...' : isConnected ? 'ONLINE' : hasError ? 'ERROR' : 'OFFLINE'}
                             </span>
                          </div>
                        </div>
                      </div>
                      
                      <Badge variant="outline" className={cn("text-[10px] font-mono border-border", 
                        isConnected ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30" : 
                        hasError ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30" : "bg-muted/50 text-muted-foreground"
                      )}>
                        {isConnected ? 'SIGNAL: STRONG' : 'NO SIGNAL'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground font-mono mb-4 pl-12 border-l border-border hidden sm:block">
                      {tool.description}
                    </p>
                  
                    <div className="pl-0 sm:pl-12">
                      {tool.authType === 'token' ? (
                        <div className="space-y-3 bg-muted/30 p-3 rounded border border-border">
                          {tool.id === 'jira' ? (
                            <>
                              <div className="space-y-1">
                                <Label htmlFor={`${tool.id}-url`} className="text-[10px] uppercase text-muted-foreground">Jira URL</Label>
                                <Input
                                  id={`${tool.id}-url`}
                                  type="url"
                                  placeholder="https://company.atlassian.net"
                                  value={tokens[tool.id]?.url || ''}
                                  onChange={(e) => handleTokenChange(tool.id, 'url', e.target.value)}
                                  className="h-8 font-mono text-xs bg-background border-border"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`${tool.id}-email`} className="text-[10px] uppercase text-muted-foreground">Email</Label>
                                <Input
                                  id={`${tool.id}-email`}
                                  type="email"
                                  placeholder="agent@company.com"
                                  value={tokens[tool.id]?.email || ''}
                                  onChange={(e) => handleTokenChange(tool.id, 'email', e.target.value)}
                                  className="h-8 font-mono text-xs bg-background border-border"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`${tool.id}-token`} className="text-[10px] uppercase text-muted-foreground">API Token</Label>
                                <div className="flex space-x-2">
                                  <Input
                                    id={`${tool.id}-token`}
                                    type="password"
                                    placeholder="••••••••••••••••"
                                    value={tokens[tool.id]?.token || ''}
                                    onChange={(e) => handleTokenChange(tool.id, 'token', e.target.value)}
                                    className="h-8 flex-1 font-mono text-xs bg-background border-border"
                                  />
                                  <Button 
                                    onClick={() => handleConnect(tool.id)}
                                    disabled={!tokens[tool.id]?.url || !tokens[tool.id]?.email || !tokens[tool.id]?.token || isConnecting}
                                    className="h-8 px-4 text-xs font-bold"
                                    variant={isConnected ? "outline" : "default"}
                                  >
                                    {isConnecting ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : isConnected ? 'UPDATE' : 'CONNECT'}
                                  </Button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-1">
                              <Label htmlFor={`${tool.id}-token`} className="text-[10px] uppercase text-muted-foreground">
                                {tool.id === 'github' ? 'Personal Access Token' : 'API Token'}
                              </Label>
                              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                <Input
                                  id={`${tool.id}-token`}
                                  type="password"
                                  placeholder="••••••••••••••••"
                                  value={tokens[tool.id]?.token || ''}
                                  onChange={(e) => handleTokenChange(tool.id, 'token', e.target.value)}
                                  className="h-8 flex-1 font-mono text-xs bg-background border-border"
                                />
                                <div className="flex space-x-2">
                                  <Button 
                                    onClick={() => handleConnect(tool.id)}
                                    disabled={!tokens[tool.id]?.token || isConnecting}
                                    variant={isConnected ? "outline" : "default"}
                                    className="h-8 px-4 text-xs font-bold flex-1 sm:flex-initial"
                                    size="sm"
                                  >
                                    {isConnecting ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : isConnected ? 'UPDATE' : 'CONNECT'}
                                  </Button>
                                  <Button
                                    onClick={() => handleTestConnection(tool.id)}
                                    disabled={isTesting}
                                    variant="ghost"
                                    className="h-8 px-3 text-xs border border-border hover:bg-muted flex-1 sm:flex-initial"
                                    size="sm"
                                  >
                                    {isTesting ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : 'TEST'}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/30 p-3 rounded border border-border gap-3">
                          <div>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase">
                              {tool.id === 'gmail' || tool.id === 'calendar'
                                ? 'SECURE OAUTH VIA NYLAS'
                                : 'STANDARD OAUTH 2.0'}
                            </p>
                            {isConnected && status?.lastSync && (
                              <p className="text-[10px] text-primary/70 mt-1 font-mono">
                                LAST SYNC: {new Date(status.lastSync).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            {isConnected && (tool.id === 'gmail' || tool.id === 'calendar') && (
                              <Button
                                onClick={() => handleDisconnect(tool.id)}
                                variant="destructive"
                                className="h-7 text-[10px] uppercase font-bold bg-red-900/20 text-red-400 border border-red-500/30 hover:bg-red-900/40"
                                size="sm"
                              >
                                Terminate
                              </Button>
                            )}
                            <Button
                              onClick={() => handleOAuthConnect(tool.id)}
                              variant={isConnected ? "outline" : "default"}
                              disabled={isConnecting}
                              className="h-7 text-[10px] uppercase font-bold"
                            >
                              {isConnecting ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-2" />
                              ) : null}
                              {isConnected ? 'Reconnect' : 'Authenticate'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-4 border-t border-border bg-muted/40 flex justify-end space-x-3 shrink-0">
          <Button variant="ghost" onClick={onClose} className="text-xs font-mono">
            [CANCEL]
          </Button>
          <Button onClick={onClose} className="text-xs font-bold font-mono bg-primary hover:bg-primary/90 text-primary-foreground">
            [CONFIRM CONFIGURATION]
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}