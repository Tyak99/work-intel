'use client';

import Link from 'next/link';
import { Users, Calendar, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    slug: string;
    role?: string;
    memberCount?: number;
    latestReportDate?: string | null;
  };
}

export function TeamCard({ team }: TeamCardProps) {
  const isAdmin = team.role === 'admin';

  const formatReportDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'No reports yet';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Link href={`/team/${team.slug}`}>
      <Card className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg normal-case">{team.name}</CardTitle>
            {isAdmin && (
              <div className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                <Shield className="w-3 h-3" />
                Admin
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>
                {team.memberCount ?? 0}{' '}
                {(team.memberCount ?? 0) === 1 ? 'member' : 'members'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatReportDate(team.latestReportDate)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
