'use client';

import { useState } from 'react';
import { GitMerge, GitPullRequest, MessageSquare, GitCommit, CheckSquare, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface MemberCardProps {
  member: {
    githubUsername: string;
    shipped: Array<{ title: string; url: string; repo: string }>;
    inFlight: Array<{ title: string; url: string; repo: string; daysSinceUpdate: number }>;
    reviewActivity: number;
    commitCount: number;
    aiSummary: string;
    jiraIssuesCompleted?: Array<{ key: string; summary: string; url: string; issueType: string }>;
    jiraIssuesInProgress?: Array<{ key: string; summary: string; url: string; issueType: string; storyPoints?: number }>;
    jiraSummary?: string;
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);
  const jiraCompleted = member.jiraIssuesCompleted?.length || 0;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
          <span className="font-medium text-foreground">@{member.githubUsername}</span>
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <GitMerge className="w-3 h-3 text-green-500" />
              {member.shipped.length} merged
            </span>
            <span className="flex items-center gap-1">
              <GitPullRequest className="w-3 h-3 text-blue-500" />
              {member.inFlight.length} open
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-purple-500" />
              {member.reviewActivity} reviews
            </span>
            <span className="flex items-center gap-1">
              <GitCommit className="w-3 h-3 text-muted-foreground" />
              {member.commitCount} commits
            </span>
            {jiraCompleted > 0 && (
              <span className="flex items-center gap-1">
                <CheckSquare className="w-3 h-3 text-indigo-500" />
                {jiraCompleted} tickets
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          {member.aiSummary && (
            <p className="text-sm text-muted-foreground italic">{member.aiSummary}</p>
          )}

          {member.jiraSummary && (
            <p className="text-sm text-indigo-600 dark:text-indigo-400 italic">{member.jiraSummary}</p>
          )}

          {member.shipped.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Shipped</h4>
              <ul className="space-y-1">
                {member.shipped.map((pr, i) => (
                  <li key={i} className="text-sm">
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {pr.title}
                      <span className="text-xs text-muted-foreground">({pr.repo})</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {member.inFlight.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">In Flight</h4>
              <ul className="space-y-1">
                {member.inFlight.map((pr, i) => (
                  <li key={i} className="text-sm flex items-center justify-between">
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      {pr.title}
                      <span className="text-xs text-muted-foreground">({pr.repo})</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    {pr.daysSinceUpdate > 2 && (
                      <span className="text-xs text-yellow-500 ml-2">{pr.daysSinceUpdate}d stale</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {member.jiraIssuesCompleted && member.jiraIssuesCompleted.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Jira - Completed</h4>
              <ul className="space-y-1">
                {member.jiraIssuesCompleted.map((issue, i) => (
                  <li key={i} className="text-sm">
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span className="text-xs font-mono text-indigo-500">{issue.key}</span>
                      {issue.summary}
                      <span className="text-xs text-muted-foreground">({issue.issueType})</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {member.jiraIssuesInProgress && member.jiraIssuesInProgress.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Jira - In Progress</h4>
              <ul className="space-y-1">
                {member.jiraIssuesInProgress.map((issue, i) => (
                  <li key={i} className="text-sm flex items-center justify-between">
                    <a
                      href={issue.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span className="text-xs font-mono text-indigo-500">{issue.key}</span>
                      {issue.summary}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    {issue.storyPoints && (
                      <span className="text-xs text-muted-foreground ml-2">{issue.storyPoints} pts</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
