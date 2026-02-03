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

interface TeamStore {
  team: Team | null;
  members: TeamMember[];
  integrations: TeamIntegration[];
  report: WeeklyReportData | null;
  isLoading: boolean;
  isGeneratingReport: boolean;
  currentUserRole: 'admin' | 'member' | null;

  fetchTeam: (teamId: string) => Promise<void>;
  fetchMembers: (teamId: string) => Promise<void>;
  fetchLatestReport: (teamId: string) => Promise<void>;
  generateReport: (teamId: string) => Promise<void>;
  addMember: (teamId: string, email: string, githubUsername?: string) => Promise<void>;
  removeMember: (teamId: string, memberId: string) => Promise<void>;
  updateMember: (teamId: string, memberId: string, updates: { github_username?: string; role?: string }) => Promise<void>;
  connectGitHub: (teamId: string, token: string, org: string) => Promise<void>;
  disconnectGitHub: (teamId: string) => Promise<void>;
  reset: () => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  team: null,
  members: [],
  integrations: [],
  report: null,
  isLoading: true,
  isGeneratingReport: false,
  currentUserRole: null,

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

  reset: () => {
    set({
      team: null,
      members: [],
      integrations: [],
      report: null,
      isLoading: true,
      isGeneratingReport: false,
      currentUserRole: null,
    });
  },
}));
