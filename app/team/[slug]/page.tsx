'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTeamStore } from '@/lib/team-store';
import { useDashboardStore } from '@/lib/store';
import { NavHeader, TeamInfo } from '@/components/nav-header';
import { SummaryBanner } from '@/components/team/summary-banner';
import { NeedsAttention } from '@/components/team/needs-attention';
import { MemberCard } from '@/components/team/member-card';
import { ReportGenerateButton } from '@/components/team/report-generate-button';
import { OnboardingWizard } from '@/components/team/onboarding-wizard';
import { WeeklyTrends } from '@/components/team/weekly-trends';
import { Settings, GitMerge, GitPullRequest, Users, MessageSquare, BarChart3, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeamDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, fetchCurrentUser } = useDashboardStore();
  const { team, members, report, integrations, isLoading, isGeneratingReport, generateReport, fetchTeam, fetchLatestReport, reset } = useTeamStore();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);
  const [wizardDismissed, setWizardDismissed] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Resolve slug to team and load all teams for the nav
  useEffect(() => {
    async function resolveTeam() {
      try {
        const response = await fetch('/api/teams', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        const teams = data.teams || [];
        setAllTeams(teams);

        const found = teams.find((t: any) => t.slug === slug);
        if (found) {
          setTeamId(found.id);
        } else {
          router.push('/');
        }
      } catch {
        router.push('/');
      }
    }
    resolveTeam();

    return () => reset();
  }, [slug]);

  useEffect(() => {
    if (teamId) {
      fetchTeam(teamId);
      fetchLatestReport(teamId);
    }
  }, [teamId]);

  if (isLoading || !team) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border bg-card/50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-4">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-7 w-12" />
              </div>
            ))}
          </div>
          {/* Member cards skeleton */}
          <div>
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-28" />
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const hasGitHub = integrations.some(i => i.provider === 'github');
  const showWizard = !hasGitHub && !wizardDismissed;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader teams={allTeams} currentTeamSlug={slug} />

      {/* Sub-header with team name and actions */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{team.name}</h1>
            <p className="text-sm text-muted-foreground">{members.length} members</p>
          </div>
          <div className="flex items-center gap-2">
            {teamId && hasGitHub && <ReportGenerateButton teamId={teamId} />}
            <Link
              href={`/team/${slug}/settings`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {showWizard && teamId ? (
          <OnboardingWizard
            teamId={teamId}
            teamName={team.name}
            teamSlug={slug}
            onComplete={() => {
              setWizardDismissed(true);
              if (teamId) {
                fetchTeam(teamId);
                fetchLatestReport(teamId);
              }
            }}
          />
        ) : report ? (
          <>
            <SummaryBanner summary={report.teamSummary} />

            {teamId && <WeeklyTrends teamId={teamId} />}

            <NeedsAttention items={report.needsAttention} />

            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Team Members</h2>
              <div className="grid gap-4">
                {report.memberSummaries.map(member => (
                  <MemberCard key={member.githubUsername} member={member} />
                ))}
              </div>
            </div>
          </>
        ) : hasGitHub ? (
          <NoReportEmptyState
            teamId={teamId}
            isGenerating={isGeneratingReport}
            onGenerate={() => teamId && generateReport(teamId)}
          />
        ) : null}
      </main>
    </div>
  );
}

function NoReportEmptyState({
  teamId,
  isGenerating,
  onGenerate,
}: {
  teamId: string | null;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Preview mockup of what a report looks like */}
      <div className="p-6 border-b border-border bg-muted/20">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Report Preview
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <GitMerge className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-muted-foreground">PRs Merged</span>
            </div>
            <div className="text-xl font-semibold text-muted-foreground/50">--</div>
          </div>
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <GitPullRequest className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-muted-foreground">PRs Open</span>
            </div>
            <div className="text-xl font-semibold text-muted-foreground/50">--</div>
          </div>
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs text-muted-foreground">Contributors</span>
            </div>
            <div className="text-xl font-semibold text-muted-foreground/50">--</div>
          </div>
          <div className="rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs text-muted-foreground">Reviews</span>
            </div>
            <div className="text-xl font-semibold text-muted-foreground/50">--</div>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>

      {/* CTA */}
      <div className="p-6 text-center">
        <BarChart3 className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Ready to generate your first report
        </h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Get an AI-powered summary of PRs merged, code reviews, and blockers across your team.
        </p>
        <button
          onClick={onGenerate}
          disabled={isGenerating || !teamId}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BarChart3 className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate Your First Report'}
        </button>
        <p className="text-xs text-muted-foreground mt-2">Takes about 30 seconds</p>
      </div>
    </div>
  );
}
