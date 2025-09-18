'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Github, Calendar, Mail, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDashboardStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tools = [
  {
    id: 'jira',
    name: 'Jira',
    icon: Settings,
    description: 'Connect to Jira for issue tracking',
    authType: 'token',
    connected: false,
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: Github,
    description: 'Connect to GitHub for PR reviews and issues',
    authType: 'token',
    connected: true,
  },
  {
    id: 'gmail',
    name: 'Gmail',
    icon: Mail,
    description: 'Read-only access to Gmail for email analysis',
    authType: 'oauth',
    connected: false,
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    icon: Calendar,
    description: 'Read-only access to Google Calendar for meeting prep',
    authType: 'oauth',
    connected: true,
  },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [tokens, setTokens] = useState<Record<string, any>>({});
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const { toolStatus, refreshToolStatus } = useDashboardStore();

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
        toast.success(`Successfully connected to ${toolId}!`);
      } else {
        toast.error(`Failed to connect to ${toolId}: ${result.message}`);
      }
    } catch (error) {
      toast.error(`Error connecting to ${toolId}. Please check your credentials.`);
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
        toast.success(`${toolId} connection is working!`);
      } else if (status?.status === 'error') {
        toast.error(`${toolId} connection failed: ${status.error}`);
      } else {
        toast.error(`${toolId} is not connected`);
      }
    } catch (error) {
      toast.error(`Failed to test ${toolId} connection`);
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
          toast.error('Failed to initiate authentication');
        }
      } catch (error) {
        toast.error('Error connecting to email/calendar');
      } finally {
        setConnecting(prev => ({ ...prev, gmail: false, calendar: false }));
      }
    } else {
      toast.error('OAuth integration coming soon!');
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
          toast.success('Successfully disconnected email and calendar');
        } else {
          toast.error('Failed to disconnect');
        }
      } catch (error) {
        toast.error('Error disconnecting');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Tool Connections</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Connect your work tools to enable AI-powered analysis and task generation.
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
                <Card key={tool.id} className={`${
                  isConnected 
                    ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/50' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span className="text-lg">{tool.name}</span>
                        {isConnecting ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Connecting...
                          </Badge>
                        ) : isTesting ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Testing...
                          </Badge>
                        ) : isConnected ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        ) : hasError ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                            <XCircle className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <XCircle className="w-3 h-3 mr-1" />
                            Disconnected
                          </Badge>
                        )}
                      </div>
                    </CardTitle>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {tool.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {tool.authType === 'token' ? (
                      <div className="space-y-3">
                        {tool.id === 'jira' ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor={`${tool.id}-url`}>Jira URL</Label>
                              <Input
                                id={`${tool.id}-url`}
                                type="url"
                                placeholder="https://your-company.atlassian.net"
                                value={tokens[tool.id]?.url || ''}
                                onChange={(e) => handleTokenChange(tool.id, 'url', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`${tool.id}-email`}>Email</Label>
                              <Input
                                id={`${tool.id}-email`}
                                type="email"
                                placeholder="your-email@company.com"
                                value={tokens[tool.id]?.email || ''}
                                onChange={(e) => handleTokenChange(tool.id, 'email', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`${tool.id}-token`}>API Token</Label>
                              <div className="flex space-x-2">
                                <Input
                                  id={`${tool.id}-token`}
                                  type="password"
                                  placeholder="Your Jira API token..."
                                  value={tokens[tool.id]?.token || ''}
                                  onChange={(e) => handleTokenChange(tool.id, 'token', e.target.value)}
                                  className="flex-1"
                                />
                                <Button 
                                  onClick={() => handleConnect(tool.id)}
                                  disabled={!tokens[tool.id]?.url || !tokens[tool.id]?.email || !tokens[tool.id]?.token || isConnecting}
                                  variant={isConnected ? "outline" : "default"}
                                >
                                  {isConnecting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : isConnected ? 'Update' : 'Connect'}
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor={`${tool.id}-token`}>
                              {tool.id === 'github' ? 'Personal Access Token' : 'API Token'}
                            </Label>
                            <div className="flex space-x-2">
                              <Input
                                id={`${tool.id}-token`}
                                type="password"
                                placeholder={`Enter your ${tool.name} token...`}
                                value={tokens[tool.id]?.token || ''}
                                onChange={(e) => handleTokenChange(tool.id, 'token', e.target.value)}
                                className="flex-1"
                              />
                              <Button 
                                onClick={() => handleConnect(tool.id)}
                                disabled={!tokens[tool.id]?.token || isConnecting}
                                variant={isConnected ? "outline" : "default"}
                                size="sm"
                              >
                                {isConnecting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isConnected ? 'Update' : 'Connect'}
                              </Button>
                              <Button
                                onClick={() => handleTestConnection(tool.id)}
                                disabled={isTesting}
                                variant="outline"
                                size="sm"
                              >
                                {isTesting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : 'Test'}
                              </Button>
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Get your {tool.id === 'github' ? 'personal access token' : 'API token'} from your {tool.name} settings.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {tool.id === 'gmail' || tool.id === 'calendar'
                              ? 'Secure read-only access via Nylas (no editing/deleting permissions)'
                              : 'Uses OAuth 2.0 for secure authentication'}
                          </p>
                          {isConnected && status?.lastSync && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Last synced: {new Date(status.lastSync).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {isConnected && (tool.id === 'gmail' || tool.id === 'calendar') && (
                            <Button
                              onClick={() => handleDisconnect(tool.id)}
                              variant="outline"
                              size="sm"
                            >
                              Disconnect
                            </Button>
                          )}
                          <Button
                            onClick={() => handleOAuthConnect(tool.id)}
                            variant={isConnected ? "outline" : "default"}
                            disabled={isConnecting}
                          >
                            {isConnecting ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {isConnected ? 'Reconnect' : 'Connect with Nylas'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={onClose}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}