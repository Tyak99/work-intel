'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTeamStore } from '@/lib/team-store';
import { useDashboardStore } from '@/lib/store';
import { SummaryBanner } from '@/components/team/summary-banner';
import { NeedsAttention } from '@/components/team/needs-attention';
import { MemberCard } from '@/components/team/member-card';
import { ReportGenerateButton } from '@/components/team/report-generate-button';
import { Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TeamDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, fetchCurrentUser } = useDashboardStore();
  const { team, members, report, integrations, isLoading, fetchTeam, fetchLatestReport, reset } = useTeamStore();
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Resolve slug to team
  useEffect(() => {
    async function resolveTeam() {
      try {
        const response = await fetch('/api/teams', { credentials: 'include' });
        if (!response.ok) return;
        const data = await response.json();
        const found = data.teams?.find((t: any) => t.slug === slug);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading team...</div>
      </div>
    );
  }

  const hasGitHub = integrations.some(i => i.provider === 'github');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{team.name}</h1>
              <p className="text-sm text-muted-foreground">{members.length} members</p>
            </div>
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
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {!hasGitHub && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground mb-3">Connect GitHub to start generating weekly reports</p>
            <Link
              href={`/team/${slug}/settings`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
            >
              <Settings className="w-4 h-4" />
              Go to Settings
            </Link>
          </div>
        )}

        {report ? (
          <>
            <SummaryBanner summary={report.teamSummary} />

            {report.needsAttention.length > 0 && (
              <NeedsAttention items={report.needsAttention} />
            )}

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
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground mb-1">No report generated yet</p>
            <p className="text-sm text-muted-foreground">Click "Generate Report" to create your first weekly summary</p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
