'use client';

import { useState } from 'react';
import { useTeamStore } from '@/lib/team-store';
import { Github, Check, X, Loader2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface GitHubConnectFormProps {
  teamId: string;
  isAdmin: boolean;
  currentIntegration: any | null;
}

export function GitHubConnectForm({ teamId, isAdmin, currentIntegration }: GitHubConnectFormProps) {
  const { connectGitHub, disconnectGitHub } = useTeamStore();
  const [token, setToken] = useState('');
  const [org, setOrg] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !org) return;
    setIsConnecting(true);
    await connectGitHub(teamId, token, org);
    trackEvent('github.connected', { teamId });
    setIsConnecting(false);
    setToken('');
  };

  const handleDisconnect = async () => {
    await disconnectGitHub(teamId);
  };

  if (currentIntegration) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5 text-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">GitHub Connected</span>
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Organization: {currentIntegration.config?.org || 'N/A'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleDisconnect}
              className="text-sm text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Disconnect
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-muted-foreground">GitHub is not connected. Ask a team admin to set it up.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleConnect} className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Github className="w-5 h-5 text-foreground" />
        <span className="font-medium text-foreground">Connect GitHub</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Organization Name
        </label>
        <input
          type="text"
          value={org}
          onChange={e => setOrg(e.target.value)}
          placeholder="e.g., my-org"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Personal Access Token
        </label>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="ghp_..."
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Needs read access to organization repos, PRs, and commits
        </p>
      </div>
      <button
        type="submit"
        disabled={!token || !org || isConnecting}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}
        {isConnecting ? 'Connecting...' : 'Connect GitHub'}
      </button>
    </form>
  );
}
