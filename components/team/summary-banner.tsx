'use client';

import { GitPullRequest, GitMerge, AlertTriangle, TrendingUp } from 'lucide-react';

interface SummaryBannerProps {
  summary: {
    totalPRsMerged: number;
    totalPRsOpen: number;
    stuckPRsCount: number;
    summary: string;
    velocity: string;
    keyHighlights: string[];
  };
}

export function SummaryBanner({ summary }: SummaryBannerProps) {
  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={GitMerge} label="PRs Merged" value={summary.totalPRsMerged} color="text-green-500" />
        <StatCard icon={GitPullRequest} label="PRs Open" value={summary.totalPRsOpen} color="text-blue-500" />
        <StatCard icon={AlertTriangle} label="Stuck PRs" value={summary.stuckPRsCount} color="text-yellow-500" />
        <StatCard icon={TrendingUp} label="Velocity" value={summary.velocity} color="text-purple-500" />
      </div>

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
      </div>
    </div>
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
