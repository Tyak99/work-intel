'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTeamStore } from '@/lib/team-store';
import { useDashboardStore } from '@/lib/store';
import { NavHeader, TeamInfo } from '@/components/nav-header';
import { GitHubConnectForm } from '@/components/team/github-connect-form';
import { JiraConnectForm } from '@/components/team/jira-connect-form';
import { MemberManagement } from '@/components/team/member-management';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TeamSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { user, fetchCurrentUser } = useDashboardStore();
  const { team, members, integrations, isLoading, fetchTeam, reset } = useTeamStore();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [allTeams, setAllTeams] = useState<TeamInfo[]>([]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

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
    }
  }, [teamId]);

  if (isLoading || !team || !teamId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const currentMember = members.find(m => m.users?.id === user?.id);
  const isAdmin = currentMember?.role === 'admin';
  const githubIntegration = integrations.find(i => i.provider === 'github');
  const jiraIntegration = integrations.find(i => i.provider === 'jira');

  return (
    <div className="min-h-screen bg-background">
      <NavHeader teams={allTeams} currentTeamSlug={slug} />

      {/* Sub-header */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/team/${slug}`} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{team.name} Settings</h1>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* GitHub Integration */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">GitHub Integration</h2>
          <GitHubConnectForm
            teamId={teamId}
            isAdmin={isAdmin}
            currentIntegration={githubIntegration}
          />
        </section>

        {/* Jira Integration */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Jira Integration</h2>
          <JiraConnectForm
            teamId={teamId}
            isAdmin={isAdmin}
            currentIntegration={jiraIntegration}
          />
        </section>

        {/* Members */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Team Members</h2>
          <MemberManagement
            teamId={teamId}
            teamName={team.name}
            members={members}
            isAdmin={isAdmin}
            currentUserId={user?.id || ''}
          />
        </section>
      </main>
    </div>
  );
}
