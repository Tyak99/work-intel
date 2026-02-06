'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  GitMerge,
  GitPullRequest,
  MessageSquare,
  GitCommit,
  AlertTriangle,
} from 'lucide-react';

interface TrendMetrics {
  prsMerged: number;
  prsOpen: number;
  reviews: number;
  commits: number;
  stuckPRs: number;
}

interface TrendWeek {
  weekStart: string;
  metrics: TrendMetrics;
}

interface WeeklyTrendsProps {
  teamId: string;
}

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getChange(current: number, previous: number): { pct: number; diff: number } {
  const diff = current - previous;
  if (previous === 0) {
    return { pct: current > 0 ? 100 : 0, diff };
  }
  return { pct: Math.round((diff / previous) * 100), diff };
}

interface MetricConfig {
  key: keyof TrendMetrics;
  label: string;
  icon: typeof GitMerge;
  color: string;
  invertTrend?: boolean; // true = up is bad (e.g. stuck PRs)
}

const METRICS: MetricConfig[] = [
  { key: 'prsMerged', label: 'PRs Merged', icon: GitMerge, color: 'text-green-500' },
  { key: 'prsOpen', label: 'PRs Open', icon: GitPullRequest, color: 'text-blue-500' },
  { key: 'reviews', label: 'Reviews', icon: MessageSquare, color: 'text-purple-500' },
  { key: 'commits', label: 'Commits', icon: GitCommit, color: 'text-muted-foreground' },
  { key: 'stuckPRs', label: 'Stuck PRs', icon: AlertTriangle, color: 'text-yellow-500', invertTrend: true },
];

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const width = 80;
  const height = 24;
  const barWidth = Math.max(4, Math.floor((width - (values.length - 1) * 2) / values.length));
  const gap = 2;

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      {values.map((val, i) => {
        const barHeight = Math.max(2, (val / max) * (height - 2));
        const x = i * (barWidth + gap);
        const y = height - barHeight;
        const isLast = i === values.length - 1;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1}
            className={isLast ? color : 'fill-muted-foreground/20'}
            fill={isLast ? undefined : undefined}
          />
        );
      })}
    </svg>
  );
}

const SPARKLINE_FILL_COLORS: Record<string, string> = {
  'text-green-500': 'fill-green-500',
  'text-blue-500': 'fill-blue-500',
  'text-purple-500': 'fill-purple-500',
  'text-muted-foreground': 'fill-muted-foreground',
  'text-yellow-500': 'fill-yellow-500',
};

function TrendCard({
  config,
  weeks,
}: {
  config: MetricConfig;
  weeks: TrendWeek[];
}) {
  const current = weeks[weeks.length - 1].metrics[config.key];
  const previous = weeks.length >= 2 ? weeks[weeks.length - 2].metrics[config.key] : null;
  const values = weeks.map((w) => w.metrics[config.key]);
  const fillColor = SPARKLINE_FILL_COLORS[config.color] || 'fill-muted-foreground';

  const change = previous !== null ? getChange(current, previous) : null;

  let trendIcon = null;
  let trendColor = 'text-muted-foreground';
  let trendText = '';

  if (change !== null && change.diff !== 0) {
    const isUp = change.diff > 0;
    const isGood = config.invertTrend ? !isUp : isUp;
    trendColor = isGood ? 'text-green-500' : 'text-red-500';
    trendIcon = isUp ? TrendingUp : TrendingDown;
    trendText =
      change.pct !== 0
        ? `${isUp ? '+' : ''}${change.pct}%`
        : `${isUp ? '+' : ''}${change.diff}`;
  } else if (change !== null) {
    trendIcon = Minus;
    trendText = 'No change';
  }

  const Icon = config.icon;
  const TrendIcon = trendIcon;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className="text-xs text-muted-foreground">{config.label}</span>
        </div>
        <Sparkline values={values} color={fillColor} />
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-semibold text-foreground">{current}</span>
        {TrendIcon && (
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{trendText}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function WeeklyTrends({ teamId }: WeeklyTrendsProps) {
  const [weeks, setWeeks] = useState<TrendWeek[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      try {
        const response = await fetch(`/api/teams/${teamId}/reports/trends`, {
          credentials: 'include',
        });
        if (!response.ok) return;
        const data = await response.json();
        setWeeks(data.weeks || []);
      } catch (error) {
        console.error('Error fetching trends:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrends();
  }, [teamId]);

  if (isLoading) return null;
  if (weeks.length < 2) return null;

  const latestWeek = formatWeekLabel(weeks[weeks.length - 1].weekStart);
  const oldestWeek = formatWeekLabel(weeks[0].weekStart);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Trends
        </h2>
        <span className="text-xs text-muted-foreground">
          {oldestWeek} - {latestWeek}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {METRICS.map((config) => (
          <TrendCard key={config.key} config={config} weeks={weeks} />
        ))}
      </div>
    </div>
  );
}
