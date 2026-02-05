'use client';

import { useState, useEffect } from 'react';
import { useTeamStore } from '@/lib/team-store';
import { UserPlus, Trash2, Edit2, Check, X, Loader2, Mail, Clock, RotateCcw } from 'lucide-react';

interface MemberManagementProps {
  teamId: string;
  members: Array<{
    id: string;
    user_id: string;
    role: 'admin' | 'member';
    github_username: string | null;
    users: {
      id: string;
      email: string;
      display_name: string | null;
    };
  }>;
  isAdmin: boolean;
  currentUserId: string;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function MemberManagement({ teamId, members, isAdmin, currentUserId }: MemberManagementProps) {
  const { sendInvite, resendInvite, revokeInvite, fetchInvites, invites, removeMember, updateMember } = useTeamStore();
  const [newEmail, setNewEmail] = useState('');
  const [newGithub, setNewGithub] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGithub, setEditGithub] = useState('');
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchInvites(teamId);
    }
  }, [isAdmin, teamId, fetchInvites]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setIsAdding(true);
    await sendInvite(teamId, newEmail, newGithub || undefined);
    setIsAdding(false);
    setNewEmail('');
    setNewGithub('');
  };

  const handleResend = async (inviteId: string) => {
    setResendingId(inviteId);
    await resendInvite(teamId, inviteId);
    setResendingId(null);
  };

  const handleStartEdit = (memberId: string, currentGithub: string | null) => {
    setEditingId(memberId);
    setEditGithub(currentGithub || '');
  };

  const handleSaveEdit = async (memberId: string) => {
    await updateMember(teamId, memberId, { github_username: editGithub });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Members list */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {members.map(member => (
            <div key={member.id} className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {member.users.display_name || member.users.email}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {member.role}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{member.users.email}</div>
                </div>

                {/* GitHub username */}
                <div className="flex items-center gap-1">
                  {editingId === member.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editGithub}
                        onChange={e => setEditGithub(e.target.value)}
                        placeholder="github username"
                        className="w-32 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                      />
                      <button onClick={() => handleSaveEdit(member.id)} className="text-green-500 hover:text-green-400">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {member.github_username ? `@${member.github_username}` : 'No GitHub'}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => handleStartEdit(member.id, member.github_username)}
                          className="text-muted-foreground hover:text-foreground ml-1"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Remove button */}
              {isAdmin && member.users.id !== currentUserId && (
                <button
                  onClick={() => removeMember(teamId, member.id)}
                  className="text-muted-foreground hover:text-destructive ml-3 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {isAdmin && invites.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Pending Invites ({invites.length})
          </h4>
          <div className="rounded-lg border border-dashed border-border bg-muted/30 overflow-hidden">
            <div className="divide-y divide-border">
              {invites.map(invite => (
                <div key={invite.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{invite.email}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {invite.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Sent {formatRelativeTime(invite.last_sent_at)}</span>
                      {invite.github_username && (
                        <span className="ml-2">@{invite.github_username}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleResend(invite.id)}
                      disabled={resendingId === invite.id}
                      className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      title="Resend invite"
                    >
                      {resendingId === invite.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => revokeInvite(teamId, invite.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Revoke invite"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Send invite form */}
      {isAdmin && (
        <form onSubmit={handleSendInvite} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-muted-foreground mb-1">GitHub (optional)</label>
            <input
              type="text"
              value={newGithub}
              onChange={e => setNewGithub(e.target.value)}
              placeholder="username"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={!newEmail || isAdding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Invite
          </button>
        </form>
      )}
    </div>
  );
}
