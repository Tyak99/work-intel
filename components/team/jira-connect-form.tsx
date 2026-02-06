'use client';

import { useState, useEffect, useRef } from 'react';
import { useTeamStore } from '@/lib/team-store';
import { Check, X, Loader2, ExternalLink, RefreshCw, Users, ChevronDown } from 'lucide-react';

interface JiraConnectFormProps {
  teamId: string;
  isAdmin: boolean;
  currentIntegration: any | null;
}

export function JiraConnectForm({ teamId, isAdmin, currentIntegration }: JiraConnectFormProps) {
  const {
    disconnectJira, fetchJiraProjects, setJiraProject, jiraProjects, isLoadingJiraProjects,
    fetchJiraMemberMatches, updateJiraMatch, confirmJiraMemberMatches,
    jiraMemberMatches, jiraAvailableUsers, isLoadingJiraMatches, isConfirmingJiraMatches,
    members,
  } = useTeamStore();
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [isChangingProject, setIsChangingProject] = useState(false);
  const [showMemberMapping, setShowMemberMapping] = useState(false);

  const config = currentIntegration?.config;
  const isConnected = !!currentIntegration;
  const hasProjectConfigured = !!(config?.project_keys?.length || config?.project_key);
  const configuredKeys: string[] = config?.project_keys || (config?.project_key ? [config.project_key] : []);

  // Check if any members have jira_account_id already mapped
  const hasMemberMappings = members.some(m => m.jira_account_id);

  const toggleProject = (key: string) => {
    setSelectedProjects(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Fetch projects when Jira is connected but no project is configured, or when changing project
  useEffect(() => {
    if (isConnected && (!hasProjectConfigured || isChangingProject) && isAdmin) {
      fetchJiraProjects(teamId);
    }
  }, [isConnected, hasProjectConfigured, isChangingProject, isAdmin, teamId]);

  const handleConnect = () => {
    window.location.href = `/api/auth/atlassian/connect?teamId=${teamId}`;
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Jira?')) return;
    setIsDisconnecting(true);
    await disconnectJira(teamId);
    setIsDisconnecting(false);
  };

  const handleSaveProject = async () => {
    if (selectedProjects.length === 0) return;
    setIsSavingProject(true);
    await setJiraProject(teamId, selectedProjects);
    setIsSavingProject(false);
    setIsChangingProject(false);
    setSelectedProjects([]);
    // After saving projects, automatically show the member mapping step
    if (isAdmin) {
      setShowMemberMapping(true);
      fetchJiraMemberMatches(teamId);
    }
  };

  const handleShowMapping = () => {
    setShowMemberMapping(true);
    fetchJiraMemberMatches(teamId);
  };

  const handleConfirmMappings = async () => {
    await confirmJiraMemberMatches(teamId);
    setShowMemberMapping(false);
  };

  // Fully connected state
  if (isConnected && hasProjectConfigured && !isChangingProject) {
    return (
      <div className="space-y-3">
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
                  {configuredKeys.length > 1 ? 'Projects' : 'Project'}: {configuredKeys.join(', ')}
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
              <div className="flex items-center gap-3">
                <button
                  onClick={handleShowMapping}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5" />
                  {hasMemberMappings ? 'Remap Team' : 'Map Team'}
                </button>
                <button
                  onClick={() => { setIsChangingProject(true); setSelectedProjects(configuredKeys); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Change Projects
                </button>
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
              </div>
            )}
          </div>
        </div>

        {/* Member mapping step */}
        {showMemberMapping && isAdmin && (
          <JiraMemberMappingPanel
            isLoading={isLoadingJiraMatches}
            matches={jiraMemberMatches}
            jiraUsers={jiraAvailableUsers}
            isConfirming={isConfirmingJiraMatches}
            onUpdateMatch={updateJiraMatch}
            onConfirm={handleConfirmMappings}
            onCancel={() => setShowMemberMapping(false)}
          />
        )}
      </div>
    );
  }

  // Changing project (already connected, switching to different projects)
  if (isConnected && isChangingProject) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-3">
          <JiraIcon className="w-5 h-5" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Jira Connected</span>
              <Check className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Current: {configuredKeys.join(', ')}
            </p>
          </div>
        </div>
        <ProjectCheckboxList
          isLoading={isLoadingJiraProjects}
          projects={jiraProjects}
          selectedKeys={selectedProjects}
          onToggle={toggleProject}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveProject}
            disabled={selectedProjects.length === 0 || isSavingProject}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingProject ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Save
          </button>
          <button
            onClick={() => { setIsChangingProject(false); setSelectedProjects([]); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
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
            <ProjectCheckboxList
              isLoading={isLoadingJiraProjects}
              projects={jiraProjects}
              selectedKeys={selectedProjects}
              onToggle={toggleProject}
              emptyMessage="No projects found. Make sure you have access to at least one Jira project."
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveProject}
                disabled={selectedProjects.length === 0 || isSavingProject}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingProject ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Save Projects
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
            Ask a team admin to select Jira projects.
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

// --- Member Mapping Panel ---

interface JiraUserOption {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  avatarUrl?: string;
  active: boolean;
}

interface MatchEntry {
  memberId: string;
  memberEmail: string;
  memberDisplayName: string | null;
  githubUsername: string | null;
  suggestedJiraUser: JiraUserOption | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchReason: string;
}

function JiraMemberMappingPanel({
  isLoading,
  matches,
  jiraUsers,
  isConfirming,
  onUpdateMatch,
  onConfirm,
  onCancel,
}: {
  isLoading: boolean;
  matches: MatchEntry[];
  jiraUsers: JiraUserOption[];
  isConfirming: boolean;
  onUpdateMatch: (memberId: string, jiraUser: JiraUserOption | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Matching team members to Jira users...
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">No team members to map.</p>
        <button onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground mt-2">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-foreground" />
          <span className="font-medium text-foreground">Map Your Team</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Match each team member to their Jira account so reports show the right data.
        </p>
      </div>

      <div className="space-y-2">
        {matches.map((match) => (
          <MemberMatchRow
            key={match.memberId}
            match={match}
            jiraUsers={jiraUsers}
            onUpdate={(jiraUser) => onUpdateMatch(match.memberId, jiraUser)}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onConfirm}
          disabled={isConfirming}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isConfirming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Confirm Mappings
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MemberMatchRow({
  match,
  jiraUsers,
  onUpdate,
}: {
  match: MatchEntry;
  jiraUsers: JiraUserOption[];
  onUpdate: (jiraUser: JiraUserOption | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const confidenceColor = {
    high: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    low: 'text-orange-600 dark:text-orange-400',
    none: 'text-muted-foreground',
  }[match.confidence];

  const confidenceLabel = {
    high: 'Email match',
    medium: 'AI match',
    low: 'Low confidence',
    none: 'No match',
  }[match.confidence];

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2">
      {/* Team member info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {match.memberDisplayName || match.memberEmail}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {match.githubUsername && `@${match.githubUsername} · `}
          {match.memberEmail}
        </div>
      </div>

      {/* Arrow */}
      <span className="text-muted-foreground text-xs flex-shrink-0">-&gt;</span>

      {/* Jira user selection */}
      <div ref={dropdownRef} className="relative flex-1 min-w-0">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm hover:bg-muted/50"
        >
          <span className="truncate text-foreground">
            {match.suggestedJiraUser
              ? match.suggestedJiraUser.displayName
              : 'Select Jira user...'}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            <button
              onClick={() => { onUpdate(null); setIsOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/50"
            >
              No match
            </button>
            {jiraUsers.map((ju) => (
              <button
                key={ju.accountId}
                onClick={() => { onUpdate(ju); setIsOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 ${
                  match.suggestedJiraUser?.accountId === ju.accountId
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground'
                }`}
              >
                <span>{ju.displayName}</span>
                {ju.emailAddress && (
                  <span className="text-xs text-muted-foreground ml-1">({ju.emailAddress})</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confidence badge */}
      <span className={`text-xs flex-shrink-0 ${confidenceColor}`}>
        {confidenceLabel}
      </span>
    </div>
  );
}

function ProjectCheckboxList({
  isLoading,
  projects,
  selectedKeys,
  onToggle,
  emptyMessage,
}: {
  isLoading: boolean;
  projects: { id: string; key: string; name: string }[];
  selectedKeys: string[];
  onToggle: (key: string) => void;
  emptyMessage?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        Select Jira Projects
      </label>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading projects...
        </div>
      ) : projects.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          {emptyMessage || 'No projects found.'}
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-1 space-y-0.5">
          {projects.map((project) => (
            <label
              key={project.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm text-foreground"
            >
              <input
                type="checkbox"
                checked={selectedKeys.includes(project.key)}
                onChange={() => onToggle(project.key)}
                className="rounded border-border"
              />
              <span>{project.name}</span>
              <span className="text-muted-foreground">({project.key})</span>
            </label>
          ))}
        </div>
      )}
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
