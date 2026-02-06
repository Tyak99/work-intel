import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env.local file.');
}

// Anon client — only for use in client-side code (if needed in the future)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client — use this for all server-side API route database access.
// Bypasses RLS; should NEVER be exposed to the browser.
let _serviceClient: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient {
  if (_serviceClient) return _serviceClient;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set, falling back to anon client');
    return supabase;
  }

  _serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _serviceClient;
}

// Database types for our tables
export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_login_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface BriefRow {
  id: string;
  user_id: string;
  brief_date: string;
  content: any; // JSONB
  generated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low' | null;
  source: string | null;
  source_id: string | null;
  url: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface NylasGrantRow {
  user_id: string;
  grant_id: string;
  email: string;
  provider: string;
  scopes: string[];
  created_at: string;
  last_sync?: string;
  user_uuid?: string;
}

export interface ToolConnectionRow {
  id: string;
  user_id: string;
  tool_type: string;
  credentials: any;
  connected_at: string;
  last_sync?: string;
}

export interface GoogleDriveGrantRow {
  id: string;
  user_id: string;
  email: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
}

export interface DriveFolderRow {
  id: string;
  user_id: string;
  folder_id: string;
  folder_name: string;
  purpose: string | null;
  enabled: boolean;
  created_at: string;
}

export interface TeamRow {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  github_username: string | null;
  joined_at: string;
}

export interface TeamIntegrationRow {
  id: string;
  team_id: string;
  provider: 'github' | 'jira' | 'linear';
  config: Record<string, any>;
  connected_by: string;
  connected_at: string;
  last_sync_at: string | null;
}

export interface WeeklyReportRow {
  id: string;
  team_id: string;
  week_start: string;
  report_data: WeeklyReportData;
  generated_at: string;
}

export interface TeamInviteRow {
  id: string;
  team_id: string;
  email: string;
  role: 'admin' | 'member';
  github_username: string | null;
  token: string;
  invited_by: string;
  created_at: string;
  last_sent_at: string;
}

export interface WeeklyReportData {
  teamSummary: {
    totalPRsMerged: number;
    totalPRsOpen: number;
    stuckPRsCount: number;
    summary: string;
    velocity: string;
    keyHighlights: string[];
    // Jira fields (optional — only present when Jira is connected)
    jiraHighlights?: string[];
    totalJiraIssuesCompleted?: number;
    totalJiraIssuesInProgress?: number;
  };
  sprintHealth?: {
    sprintName: string;
    progress: string;
    completionRate: string;
    pointsCompleted: number | null;
    pointsRemaining: number | null;
    daysRemaining: number | null;
    insight: string;
  };
  needsAttention: Array<{
    type: 'stuck_pr' | 'blocked_pr' | 'unreviewed_pr' | 'blocked_issue' | 'stale_issue';
    title: string;
    url: string;
    repo: string;
    author: string;
    daysSinceUpdate: number;
    reason: string;
  }>;
  memberSummaries: Array<{
    githubUsername: string;
    shipped: Array<{ title: string; url: string; repo: string }>;
    inFlight: Array<{ title: string; url: string; repo: string; daysSinceUpdate: number }>;
    reviewActivity: number;
    commitCount: number;
    aiSummary: string;
    // Jira fields (optional)
    jiraIssuesCompleted?: Array<{ key: string; summary: string; url: string; issueType: string }>;
    jiraIssuesInProgress?: Array<{ key: string; summary: string; url: string; issueType: string; storyPoints?: number }>;
    jiraSummary?: string;
  }>;
  rateLimitInfo?: {
    isPartial: boolean;
    message: string;
  };
  hasJiraData?: boolean;
}

export interface AtlassianOAuthStateRow {
  id: string;
  team_id: string;
  user_id: string;
  state_token: string;
  expires_at: string;
  created_at: string;
}

export interface JiraIntegrationConfig {
  cloud_id: string;
  site_url: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  scopes: string[];
  connected_email: string;
  project_key?: string;
  project_keys?: string[];
}

export interface GitHubOAuthConfig {
  installation_id: number;
  org: string;
  org_id: number;
  connected_email: string;
  auth_type: 'github_app';
}

export interface GitHubPATConfig {
  org: string;
  encrypted_token: string;
  auth_type?: undefined;
}

export interface GitHubOAuthStateRow {
  id: string;
  team_id: string;
  user_id: string;
  state_token: string;
  redirect_to: string | null;
  expires_at: string;
  created_at: string;
}
