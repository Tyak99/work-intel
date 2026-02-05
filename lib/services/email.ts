import { Resend } from 'resend';
import { getServiceSupabase, WeeklyReportData } from '../supabase';
import { getTeamMembersWithEmails, getTeamById } from './team-auth';
import { generateWeeklyReport, getLatestWeeklyReport } from './team-report';
import {
  buildManagerEmailHtml,
  buildDeveloperEmailHtml,
  buildManagerEmailSubject,
  buildDeveloperEmailSubject,
} from '../email-templates/weekly-report';
import {
  buildTeamInviteEmailHtml,
  buildTeamInviteEmailSubject,
} from '../email-templates/team-invite';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || 'reports@work-intel.vercel.app';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://work-intel.vercel.app';

export interface SendEmailResult {
  success: boolean;
  email: string;
  error?: string;
}

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  return weekStart.toISOString().split('T')[0];
}

export async function sendTeamReportEmail(
  to: string,
  teamName: string,
  teamSlug: string,
  reportData: WeeklyReportData,
  isManager: boolean,
  githubUsername?: string | null
): Promise<SendEmailResult> {
  const weekStartDate = getWeekStartDate();
  const dashboardUrl = `${BASE_URL}/team/${teamSlug}`;

  const context = {
    teamName,
    weekStartDate,
    dashboardUrl,
  };

  const subject = isManager
    ? buildManagerEmailSubject(teamName, weekStartDate)
    : buildDeveloperEmailSubject(teamName, weekStartDate);

  const html = isManager || !githubUsername
    ? buildManagerEmailHtml(reportData, context)
    : buildDeveloperEmailHtml(reportData, githubUsername, context);

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: `Work Intel <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`Failed to send email to ${to}:`, error);
      return { success: false, email: to, error: error.message };
    }

    return { success: true, email: to };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to send email to ${to}:`, errorMessage);
    return { success: false, email: to, error: errorMessage };
  }
}

export interface TeamEmailSummary {
  teamId: string;
  teamName: string;
  totalMembers: number;
  emailsSent: number;
  emailsFailed: number;
  results: SendEmailResult[];
}

export async function sendWeeklyReportsForTeam(teamId: string): Promise<TeamEmailSummary> {
  const team = await getTeamById(teamId);
  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  // Generate fresh report or use existing if generated today
  let report = await getLatestWeeklyReport(teamId);
  const today = new Date().toISOString().split('T')[0];

  // Check if we need to generate a new report
  const { data: reportRow } = await getServiceSupabase()
    .from('weekly_reports')
    .select('generated_at')
    .eq('team_id', teamId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  const reportGeneratedToday = reportRow?.generated_at?.startsWith(today);

  if (!report || !reportGeneratedToday) {
    console.log(`Generating fresh report for team ${team.name}`);
    report = await generateWeeklyReport(teamId);
  }

  const members = await getTeamMembersWithEmails(teamId);
  const results: SendEmailResult[] = [];

  for (const member of members) {
    const isManager = member.role === 'admin';
    const result = await sendTeamReportEmail(
      member.email,
      team.name,
      team.slug,
      report,
      isManager,
      member.githubUsername
    );
    results.push(result);

    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return {
    teamId,
    teamName: team.name,
    totalMembers: members.length,
    emailsSent: results.filter(r => r.success).length,
    emailsFailed: results.filter(r => !r.success).length,
    results,
  };
}

export async function getTeamsWithGitHubIntegration(): Promise<Array<{ teamId: string; teamName: string }>> {
  const { data, error } = await getServiceSupabase()
    .from('team_integrations')
    .select(`
      team_id,
      teams!inner (
        id,
        name
      )
    `)
    .eq('provider', 'github');

  if (error || !data) {
    console.error('Error fetching teams with GitHub integration:', error);
    return [];
  }

  return data.map((row: any) => ({
    teamId: row.team_id,
    teamName: row.teams.name,
  }));
}

export async function sendTeamInviteEmail(
  to: string,
  teamName: string,
  inviterName: string,
  role: 'admin' | 'member',
  token: string
): Promise<SendEmailResult> {
  const acceptUrl = `${BASE_URL}/api/invites/${token}`;

  const subject = buildTeamInviteEmailSubject(teamName);
  const html = buildTeamInviteEmailHtml({
    teamName,
    inviterName,
    role,
    acceptUrl,
  });

  try {
    const resend = getResendClient();
    const { error } = await resend.emails.send({
      from: `Work Intel <${FROM_ADDRESS}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`Failed to send invite email to ${to}:`, error);
      return { success: false, email: to, error: error.message };
    }

    return { success: true, email: to };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to send invite email to ${to}:`, errorMessage);
    return { success: false, email: to, error: errorMessage };
  }
}
