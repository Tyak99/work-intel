'use client';

import { useTeamStore } from '@/lib/team-store';
import { RefreshCw, Loader2 } from 'lucide-react';

interface ReportGenerateButtonProps {
  teamId: string;
}

export function ReportGenerateButton({ teamId }: ReportGenerateButtonProps) {
  const { isGeneratingReport, generateReport } = useTeamStore();

  return (
    <button
      onClick={() => generateReport(teamId)}
      disabled={isGeneratingReport}
      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isGeneratingReport ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      {isGeneratingReport ? 'Generating...' : 'Generate Report'}
    </button>
  );
}
