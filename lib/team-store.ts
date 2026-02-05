'use client';

import { create } from 'zustand';
import toast from 'react-hot-toast';
import { WeeklyReportData } from './supabase';

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'admin' | 'member';
  github_username: string | null;
  joined_at: string;
  users: {
    id: string;
    email: string;
    display_name: string | null;
  };
}

interface TeamInvite {
  id: string;
  email: string;
  role: 'admin' | 'member';
  github_username: string | null;
  created_at: string;
  last_sent_at: string;
  invited_by: string;
  users?: {
    display_name: string | null;
    email: string;
  };
}

interface TeamIntegration {
  id: string;
  team_id: string;
  provider: string;
  config: Record<string, any>;
  connected_by: string;
  connected_at: string;
  last_sync_at: string | null;
}

interface Team {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl?: string;
  projectTypeKey: string;
}

interface TeamStore {
  team: Team | null;
  members: TeamMember[];
  invites: TeamInvite[];
  integrations: TeamIntegration[];
  report: WeeklyReportData | null;
  isLoading: boolean;
  isGeneratingReport: boolean;
  currentUserRole: 'admin' | 'member' | null;
  jiraProjects: JiraProject[];
  isLoadingJiraProjects: boolean;

  fetchTeam: (teamId: string) => Promise<void>;
  fetchMembers: (teamId: string) => Promise<void>;
  fetchInvites: (teamId: string) => Promise<void>;
  fetchLatestReport: (teamId: string) => Promise<void>;
  generateReport: (teamId: string) => Promise<void>;
  sendInvite: (teamId: string, email: string, githubUsername?: string, role?: 'admin' | 'member') => Promise<void>;
  resendInvite: (teamId: string, inviteId: string) => Promise<void>;
  revokeInvite: (teamId: string, inviteId: string) => Promise<void>;
  addMember: (teamId: string, email: string, githubUsername?: string) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  updateMember: (teamId: string, memberId: string, updates: { github_username?: string; role?: string }) => Promise<void>;
  connectGitHub: (teamId: string, token: string, org: string) => Promise<void>;
  disconnectGitHub: (teamId: string) => Promise<void>;
  disconnectJira: (teamId: string) => Promise<void>;
  fetchJiraProjects: (teamId: string) => Promise<void>;
  setJiraProject: (teamId: string, projectKey: string) => Promise<void>;
  reset: () => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  team: null,
  members: [],
  invites: [],
  integrations: [],
  report: null,
  isLoading: true,
  isGeneratingReport: false,
  currentUserRole: null,
  jiraProjects: [],
  isLoadingJiraProjects: false,

  fetchTeam: async (teamId: string) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/teams/${teamId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch team');

      const data = await response.json();
      set({
        team: data.team,
        members: data.members || [],
        integrations: data.integrations || [],
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching team:', error);
      set({ isLoading: false });
    }
  },

  fetchMembers: async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch members');

      const data = await response.json();
      set({ members: data.members || [] });
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  },

  fetchInvites: async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invites`, { credentials: 'include' });
      if (!response.ok) {
        // Non-admins will get 403, which is expected
        if (response.status === 403) {
          set({ invites: [] });
          return;
        }
        throw new Error('Failed to fetch invites');
      }

      const data = await response.json();
      set({ invites: data.invites || [] });
    } catch (error) {
      console.error('Error fetching invites:', error);
      set({ invites: [] });
    }
  },

  fetchLatestReport: async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/reports/latest`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch report');

      const data = await response.json();
      set({ report: data.report || null });
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  },

  generateReport: async (teamId: string) => {
    set({ isGeneratingReport: true });
    try {
      const response = await fetch(`/api/teams/${teamId}/reports/generate`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }

      const data = await response.json();
      set({ report: data.report, isGeneratingReport: false });
      toast.success('Weekly report generated!');
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error.message || 'Failed to generate report');
      set({ isGeneratingReport: false });
    }
  },

  sendInvite: async (teamId: string, email: string, githubUsername?: string, role?: 'admin' | 'member') => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, github_username: githubUsername, role: role || 'member' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invite');
      }

      const data = await response.json();
      // Refresh invites list
      await get().fetchInvites(teamId);
      toast.success(data.message || 'Invite sent!');
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invite');
    }
  },

  resendInvite: async (teamId: string, inviteId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}/resend`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to resend invite');
      }

      // Refresh invites list to update last_sent_at
      await get().fetchInvites(teamId);
      toast.success('Invite resent!');
    } catch (error: any) {
      console.error('Error resending invite:', error);
      toast.error(error.message || 'Failed to resend invite');
    }
  },

  revokeInvite: async (teamId: string, inviteId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invites/${inviteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invite');
      }

      set(state => ({ invites: state.invites.filter(i => i.id !== inviteId) }));
      toast.success('Invite revoked');
    } catch (error: any) {
      console.error('Error revoking invite:', error);
      toast.error(error.message || 'Failed to revoke invite');
    }
  },

  addMember: async (teamId: string, email: string, githubUsername?: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, github_username: githubUsername }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      const data = await response.json();
      set(state => ({ members: [...state.members, data.member] }));
      toast.success('Member added!');
    } catch (error: any) {
      console.error('Error adding member:', error);
      toast.error(error.message || 'Failed to add member');
    }
  },

  removeMember: async (teamId: string, memberId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }

      set(state => ({ members: state.members.filter(m => m.id !== memberId) }));
      toast.success('Member removed');
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    }
  },

  updateMember: async (teamId: string, memberId: string, updates) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update member');

      const data = await response.json();
      set(state => ({
        members: state.members.map(m => m.id === memberId ? data.member : m),
      }));
      toast.success('Member updated');
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member');
    }
  },

  connectGitHub: async (teamId: string, token: string, org: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/integrations/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, org }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect GitHub');
      }

      const data = await response.json();
      set(state => ({
        integrations: [
          ...state.integrations.filter(i => i.provider !== 'github'),
          { ...data.integration, team_id: teamId, config: { org }, connected_at: new Date().toISOString(), connected_by: '', last_sync_at: null },
        ],
      }));
      toast.success('GitHub connected!');
    } catch (error: any) {
      console.error('Error connecting GitHub:', error);
      toast.error(error.message || 'Failed to connect GitHub');
    }
  },

  disconnectGitHub: async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/integrations/github`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to disconnect GitHub');

      set(state => ({
        integrations: state.integrations.filter(i => i.provider !== 'github'),
      }));
      toast.success('GitHub disconnected');
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      toast.error('Failed to disconnect GitHub');
    }
  },

  disconnectJira: async (teamId: string) => {
    try {
      const response = await fetch('/api/auth/atlassian/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) throw new Error('Failed to disconnect Jira');

      set(state => ({
        integrations: state.integrations.filter(i => i.provider !== 'jira'),
        jiraProjects: [],
      }));
      toast.success('Jira disconnected');
    } catch (error) {
      console.error('Error disconnecting Jira:', error);
      toast.error('Failed to disconnect Jira');
    }
  },

  fetchJiraProjects: async (teamId: string) => {
    set({ isLoadingJiraProjects: true });
    try {
      const response = await fetch(`/api/teams/${teamId}/jira/projects`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch Jira projects');
      }

      const data = await response.json();
      set({ jiraProjects: data.projects || [], isLoadingJiraProjects: false });
    } catch (error: any) {
      console.error('Error fetching Jira projects:', error);
      set({ jiraProjects: [], isLoadingJiraProjects: false });
      toast.error(error.message || 'Failed to fetch Jira projects');
    }
  },

  setJiraProject: async (teamId: string, projectKey: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/jira/project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set Jira project');
      }

      // Update the integration config in state
      set(state => ({
        integrations: state.integrations.map(i =>
          i.provider === 'jira'
            ? { ...i, config: { ...i.config, project_key: projectKey } }
            : i
        ),
      }));
      toast.success('Jira project configured!');
    } catch (error: any) {
      console.error('Error setting Jira project:', error);
      toast.error(error.message || 'Failed to set Jira project');
    }
  },

  reset: () => {
    set({
      team: null,
      members: [],
      invites: [],
      integrations: [],
      report: null,
      isLoading: true,
      isGeneratingReport: false,
      currentUserRole: null,
      jiraProjects: [],
      isLoadingJiraProjects: false,
    });
  },
}));
