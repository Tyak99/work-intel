'use client';

import { GitPullRequest, GitMerge, AlertTriangle, TrendingUp, CheckSquare, ListTodo } from 'lucide-react';

interface SummaryBannerProps {
  summary: {
    totalPRsMerged: number;
    totalPRsOpen: number;
    stuckPRsCount: number;
    summary: string;
    velocity: string;
    keyHighlights: string[];
    jiraHighlights?: string[];
    totalJiraIssuesCompleted?: number;
    totalJiraIssuesInProgress?: number;
  };
  sprintHealth?: {
    sprintName: string;
    progress: string;
    completionRate: string;
    pointsCompleted: number | null;
    pointsRemaining: number | null;
    daysRemaining: number | null;
    insight: string;
  } | null;
}

export function SummaryBanner({ summary, sprintHealth }: SummaryBannerProps) {
  const hasJira = summary.totalJiraIssuesCompleted !== undefined;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className={`grid grid-cols-2 ${hasJira ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-4'} gap-4`}>
        <StatCard icon={GitMerge} label="PRs Merged" value={summary.totalPRsMerged} color="text-green-500" />
        <StatCard icon={GitPullRequest} label="PRs Open" value={summary.totalPRsOpen} color="text-blue-500" />
        <StatCard icon={AlertTriangle} label="Need Attention" value={summary.stuckPRsCount} color="text-yellow-500" />
        <StatCard icon={TrendingUp} label="Velocity" value={summary.velocity} color="text-purple-500" />
        {hasJira && (
          <>
            <StatCard icon={CheckSquare} label="Issues Done" value={summary.totalJiraIssuesCompleted || 0} color="text-indigo-500" />
            <StatCard icon={ListTodo} label="In Progress" value={summary.totalJiraIssuesInProgress || 0} color="text-orange-500" />
          </>
        )}
      </div>

      {/* Sprint Health (only when Jira has active sprint) */}
      {sprintHealth && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
              Sprint: {sprintHealth.sprintName}
            </h3>
            <SprintProgressBadge progress={sprintHealth.progress} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-indigo-600 dark:text-indigo-400">
            <span>{sprintHealth.completionRate}</span>
            {sprintHealth.daysRemaining !== null && (
              <span>{sprintHealth.daysRemaining}d remaining</span>
            )}
            {sprintHealth.pointsCompleted !== null && sprintHealth.pointsRemaining !== null && (
              <span>{sprintHealth.pointsCompleted}pts done / {sprintHealth.pointsRemaining}pts left</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">{sprintHealth.insight}</p>
        </div>
      )}

      {/* AI Summary */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-foreground">{summary.summary}</p>
        {summary.keyHighlights.length > 0 && (
          <ul className="mt-3 space-y-1">
            {summary.keyHighlights.map((highlight, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">-</span>
                {highlight}
              </li>
            ))}
          </ul>
        )}
        {summary.jiraHighlights && summary.jiraHighlights.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Jira Highlights</p>
            <ul className="space-y-1">
              {summary.jiraHighlights.map((highlight, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">-</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SprintProgressBadge({ progress }: { progress: string }) {
  const colorMap: Record<string, string> = {
    'On track': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'At risk': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Behind': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const classes = colorMap[progress] || 'bg-muted text-muted-foreground';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes}`}>
      {progress}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
