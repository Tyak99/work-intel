'use client';

import { useState, useEffect } from 'react';
import { useTeamStore } from '@/lib/team-store';
import { Check, X, Loader2, ExternalLink } from 'lucide-react';

interface JiraConnectFormProps {
  teamId: string;
  isAdmin: boolean;
  currentIntegration: any | null;
}

export function JiraConnectForm({ teamId, isAdmin, currentIntegration }: JiraConnectFormProps) {
  const { disconnectJira, fetchJiraProjects, setJiraProject, jiraProjects, isLoadingJiraProjects } = useTeamStore();
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);

  const config = currentIntegration?.config;
  const isConnected = !!currentIntegration;
  const hasProjectConfigured = !!config?.project_key;

  // Fetch projects when Jira is connected but no project is configured
  useEffect(() => {
    if (isConnected && !hasProjectConfigured && isAdmin) {
      fetchJiraProjects(teamId);
    }
  }, [isConnected, hasProjectConfigured, isAdmin, teamId]);

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = `/api/auth/atlassian/connect?teamId=${teamId}`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Jira?')) return;
    setIsDisconnecting(true);
    await disconnectJira(teamId);
    setIsDisconnecting(false);
  };

  const handleSaveProject = async () => {
    if (!selectedProject) return;
    setIsSavingProject(true);
    await setJiraProject(teamId, selectedProject);
    setIsSavingProject(false);
  };

  // Fully connected state
  if (isConnected && hasProjectConfigured) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <JiraIcon className="w-5 h-5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Jira Connected</span>
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                Project: {config?.project_key}
              </p>
              {config?.site_url && (
                <a
                  href={config.site_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  {config.site_url.replace('https://', '')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-sm text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {isDisconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              Disconnect
            </button>
          )}
        </div>
      </div>
    );
  }

  // Connected but needs project selection
  if (isConnected && !hasProjectConfigured) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <JiraIcon className="w-5 h-5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Jira Connected</span>
              <span className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded">
                Setup Required
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connected to: {config?.site_url?.replace('https://', '') || 'Atlassian'}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Select Jira Project
              </label>
              {isLoadingJiraProjects ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading projects...
                </div>
              ) : jiraProjects.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  No projects found. Make sure you have access to at least one Jira project.
                </div>
              ) : (
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a project...</option>
                  {jiraProjects.map((project) => (
                    <option key={project.id} value={project.key}>
                      {project.name} ({project.key})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveProject}
                disabled={!selectedProject || isSavingProject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingProject ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Project
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Cancel'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ask a team admin to select a Jira project.
          </p>
        )}
      </div>
    );
  }

  // Not connected state
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center">
        <p className="text-muted-foreground">Jira is not connected. Ask a team admin to set it up.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <JiraIcon className="w-5 h-5" />
        <span className="font-medium text-foreground">Connect Jira</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Connect your Atlassian account to track sprint progress and issues in your weekly reports.
      </p>
      <button
        onClick={handleConnect}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
      >
        <JiraIcon className="w-4 h-4" />
        Connect Jira
      </button>
    </div>
  );
}

function JiraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M11.75 2a9.75 9.75 0 1 0 0 19.5 9.75 9.75 0 0 0 0-19.5zm4.308 6.442l-4.616 4.616a.626.626 0 0 1-.884 0L6.942 9.442a.626.626 0 0 1 .884-.884l3.174 3.174 4.174-4.174a.626.626 0 0 1 .884.884z" />
    </svg>
  );
}
