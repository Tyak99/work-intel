'use client';

import { useState, useEffect } from 'react';
import { useTeamStore } from '@/lib/team-store';
import { Github, Check, X, Loader2, ExternalLink, Info, ChevronDown } from 'lucide-react';
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
  const [showPATForm, setShowPATForm] = useState(false);
  const [githubAppEnabled, setGithubAppEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/auth/github/config')
      .then(r => r.json())
      .then(data => setGithubAppEnabled(data.githubAppEnabled))
      .catch(() => setGithubAppEnabled(false));
  }, []);

  const handlePATConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !org) return;
    setIsConnecting(true);
    const success = await connectGitHub(teamId, token, org);
    setIsConnecting(false);
    if (success) {
      trackEvent('github.connected', { teamId, method: 'pat' });
      setToken('');
    }
  };

  const handleOAuthConnect = () => {
    trackEvent('github.oauth_started', { teamId });
    window.location.href = `/api/auth/github/connect?teamId=${teamId}&redirectTo=settings`;
  };

  const handleDisconnect = async () => {
    await disconnectGitHub(teamId);
  };

  // Connected state
  if (currentIntegration) {
    const config = currentIntegration.config;
    const isGitHubApp = config?.auth_type === 'github_app';

    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5 text-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">GitHub Connected</span>
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Organization: {config?.org || 'N/A'}
                {isGitHubApp && (
                  <span className="ml-2 text-xs text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                    GitHub App
                  </span>
                )}
                {!isGitHubApp && (
                  <span className="ml-2 text-xs text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                    Personal Token
                  </span>
                )}
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

        {/* PAT upgrade banner */}
        {!isGitHubApp && githubAppEnabled && isAdmin && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-foreground font-medium">Upgrade to GitHub App</p>
              <p className="text-muted-foreground mt-0.5">
                Tokens auto-rotate and aren&apos;t tied to a single person&apos;s account.
              </p>
              <button
                onClick={handleOAuthConnect}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                Upgrade now
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Non-admin: can't connect
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-muted-foreground">GitHub is not connected. Ask a team admin to set it up.</p>
      </div>
    );
  }

  // Disconnected: show connect options
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Github className="w-5 h-5 text-foreground" />
        <span className="font-medium text-foreground">Connect GitHub</span>
      </div>

      {githubAppEnabled ? (
        <>
          {/* Primary: GitHub App OAuth */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Install the Work Intel GitHub App on your organization. One-click setup with automatic token management.
            </p>
            <button
              onClick={handleOAuthConnect}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
            >
              <Github className="w-4 h-4" />
              Install GitHub App
            </button>
          </div>

          {/* Secondary: PAT fallback */}
          <div className="border-t border-border pt-3">
            <button
              onClick={() => setShowPATForm(!showPATForm)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showPATForm ? 'rotate-180' : ''}`} />
              Or use a Personal Access Token
            </button>

            {showPATForm && (
              <form onSubmit={handlePATConnect} className="mt-3 space-y-3">
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
                  {isConnecting ? 'Connecting...' : 'Connect with PAT'}
                </button>
              </form>
            )}
          </div>
        </>
      ) : (
        /* GitHub App not configured: show PAT form directly */
        <form onSubmit={handlePATConnect} className="space-y-4">
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
      )}
    </div>
  );
}
