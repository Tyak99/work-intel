'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { NavHeader, TeamInfo } from '@/components/nav-header';
import { TeamCard } from '@/components/team/team-card';
import { CreateTeamModal } from '@/components/team/create-team-modal';
import { Button } from '@/components/ui/button';

interface TeamWithDetails extends TeamInfo {
  latestReportDate?: string | null;
}

export default function Home() {
  const router = useRouter();
  const { user, isLoadingUser, fetchCurrentUser } = useDashboardStore();
  const [teams, setTeams] = useState<TeamWithDetails[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoadingUser && !user) {
      router.replace('/login');
    }
  }, [isLoadingUser, user, router]);

  // Load teams when user is available
  useEffect(() => {
    async function loadTeams() {
      if (!user) return;

      try {
        const response = await fetch('/api/teams', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setTeams(data.teams || []);
        }
      } catch (error) {
        console.error('Error loading teams:', error);
      } finally {
        setIsLoadingTeams(false);
      }
    }

    if (user) {
      loadTeams();
    }
  }, [user]);

  // Loading state
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-primary/20 blur animate-pulse" />
            <div className="relative h-12 w-12 rounded-full border-2 border-primary/50 border-t-transparent animate-spin" />
          </div>
          <p className="font-mono text-sm text-primary animate-pulse tracking-widest uppercase">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in - useEffect will redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono">
          Redirecting to login...
        </p>
      </div>
    );
  }

  const hasTeams = teams.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <NavHeader teams={teams} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Teams</h1>
            <p className="text-muted-foreground mt-1">
              {hasTeams
                ? 'Track engineering activity and weekly reports'
                : 'Create your first team to get started'}
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Team
          </Button>
        </div>

        {/* Teams Grid or Empty State */}
        {isLoadingTeams ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl border border-border bg-card/50 animate-pulse"
              />
            ))}
          </div>
        ) : hasTeams ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No teams yet
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Teams let you track GitHub activity across your engineering group
              and generate AI-powered weekly reports.
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Team
            </Button>
          </div>
        )}
      </main>

      <CreateTeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
