'use client';

import { useState } from 'react';
import { GitMerge, GitPullRequest, MessageSquare, GitCommit, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

interface MemberCardProps {
  member: {
    githubUsername: string;
    shipped: Array<{ title: string; url: string; repo: string }>;
    inFlight: Array<{ title: string; url: string; repo: string; daysSinceUpdate: number }>;
    reviewActivity: number;
    commitCount: number;
    aiSummary: string;
  };
}

export function MemberCard({ member }: MemberCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">@{member.githubUsername}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3">
          {member.aiSummary && (
            <p className="text-sm text-muted-foreground italic">{member.aiSummary}</p>
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
        </div>
      )}
    </div>
  );
}
