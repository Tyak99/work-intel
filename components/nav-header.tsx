'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Users, Home } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export interface TeamInfo {
  id: string;
  name: string;
  slug: string;
  role?: string;
  memberCount?: number;
}

interface NavHeaderProps {
  teams: TeamInfo[];
  currentTeamSlug?: string;
}

export function NavHeader({ teams, currentTeamSlug }: NavHeaderProps) {
  const router = useRouter();
  const { user, logout } = useDashboardStore();

  const currentTeam = currentTeamSlug
    ? teams.find((t) => t.slug === currentTeamSlug)
    : null;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + Team Switcher */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-xl font-bold text-foreground hover:text-primary transition-colors"
          >
            Work Intel
          </Link>

          {teams.length > 0 && (
            <>
              <span className="text-border">/</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 font-medium">
                    <Users className="w-4 h-4" />
                    {currentTeam?.name || 'Select Team'}
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Your Teams</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => router.push(`/team/${team.slug}`)}
                      className={
                        team.slug === currentTeamSlug
                          ? 'bg-accent'
                          : ''
                      }
                    >
                      <Users className="w-4 h-4 mr-2" />
                      <span className="flex-1">{team.name}</span>
                      {team.role === 'admin' && (
                        <span className="text-xs text-muted-foreground">
                          Admin
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/')}>
                    <Home className="w-4 h-4 mr-2" />
                    All Teams
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                  {user?.displayName?.[0] || user?.email?.[0] || '?'}
                </div>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.displayName || 'User'}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
