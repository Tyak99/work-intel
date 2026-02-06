'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTeamStore } from '@/lib/team-store';
import {
  Github,
  Check,
  Loader2,
  Mail,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  BarChart3,
  Users,
  ArrowRight,
  ExternalLink,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OnboardingWizardProps {
  teamId: string;
  teamName: string;
  teamSlug: string;
  onComplete: () => void;
}

const STEPS = [
  { label: 'Connect GitHub', icon: Github },
  { label: 'Invite Team', icon: Users },
  { label: 'Ready', icon: BarChart3 },
];

export function OnboardingWizard({ teamId, teamName, teamSlug, onComplete }: OnboardingWizardProps) {
  const { connectGitHub, sendInvite, generateReport, isGeneratingReport } = useTeamStore();
  const searchParams = useSearchParams();

  // Detect if user was redirected back from GitHub OAuth
  const githubConnectedParam = searchParams.get('github_connected') === 'true';

  const [currentStep, setCurrentStep] = useState(githubConnectedParam ? 1 : 0);

  // GitHub step state
  const [token, setToken] = useState('');
  const [org, setOrg] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [githubConnected, setGithubConnected] = useState(githubConnectedParam);
  const [showPATForm, setShowPATForm] = useState(false);
  const [githubAppEnabled, setGithubAppEnabled] = useState(false);

  // Invite step state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteGithub, setInviteGithub] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentInvites, setSentInvites] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/auth/github/config')
      .then(r => r.json())
      .then(data => setGithubAppEnabled(data.githubAppEnabled))
      .catch(() => setGithubAppEnabled(false));
  }, []);

  const handleConnectGitHubPAT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !org) return;
    setIsConnecting(true);
    const success = await connectGitHub(teamId, token, org);
    setIsConnecting(false);
    if (success) {
      setGithubConnected(true);
      setToken('');
      // Auto-advance after short delay so user sees the success state
      setTimeout(() => setCurrentStep(1), 600);
    }
  };

  const handleOAuthConnect = () => {
    window.location.href = `/api/auth/github/connect?teamId=${teamId}&redirectTo=onboarding`;
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsSending(true);
    await sendInvite(teamId, inviteEmail, inviteGithub || undefined);
    setSentInvites(prev => [...prev, inviteEmail]);
    setIsSending(false);
    setInviteEmail('');
    setInviteGithub('');
  };

  const handleGenerateFirstReport = async () => {
    await generateReport(teamId);
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((step, i) => {
          const StepIcon = step.icon;
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;

          return (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors
                    ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <span
                  className={`text-sm hidden sm:inline ${
                    isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px mx-1 ${
                    i < currentStep ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {/* Step 0: Connect GitHub */}
        {currentStep === 0 && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Github className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Connect GitHub</h2>
              <p className="text-sm text-muted-foreground mt-1">
                We&apos;ll read your org&apos;s PRs, commits, and reviews to generate weekly reports.
              </p>
            </div>

            {githubConnected ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center gap-2 text-green-500 font-medium">
                  <Check className="w-5 h-5" />
                  GitHub connected
                </div>
              </div>
            ) : githubAppEnabled ? (
              /* GitHub App OAuth flow (primary) */
              <div className="space-y-4">
                <Button onClick={handleOAuthConnect} className="w-full">
                  <Github className="w-4 h-4 mr-2" />
                  Install GitHub App
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  One-click setup. Installs on your organization with read-only access.
                </p>

                {/* PAT fallback */}
                <div className="border-t border-border pt-3">
                  <button
                    onClick={() => setShowPATForm(!showPATForm)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                  >
                    <ChevronDown className={`w-3 h-3 transition-transform ${showPATForm ? 'rotate-180' : ''}`} />
                    Or use a Personal Access Token
                  </button>

                  {showPATForm && (
                    <form onSubmit={handleConnectGitHubPAT} className="mt-3 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Organization Name
                        </label>
                        <input
                          type="text"
                          value={org}
                          onChange={e => setOrg(e.target.value)}
                          placeholder="e.g., my-org"
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                          Personal Access Token
                        </label>
                        <input
                          type="password"
                          value={token}
                          onChange={e => setToken(e.target.value)}
                          placeholder="ghp_..."
                          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Required scopes: <code className="px-1 py-0.5 rounded bg-muted text-xs">repo</code> and <code className="px-1 py-0.5 rounded bg-muted text-xs">read:org</code>
                          </p>
                          <a
                            href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=Work+Intel+Team+Access"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Create a token on GitHub
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={!token || !org || isConnecting}
                        className="w-full"
                      >
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Github className="w-4 h-4 mr-2" />
                        )}
                        {isConnecting ? 'Connecting...' : 'Connect with PAT'}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            ) : (
              /* PAT-only flow (GitHub App not configured) */
              <form onSubmit={handleConnectGitHubPAT} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={org}
                    onChange={e => setOrg(e.target.value)}
                    placeholder="e.g., my-org"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    placeholder="ghp_..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Required scopes: <code className="px-1 py-0.5 rounded bg-muted text-xs">repo</code> and <code className="px-1 py-0.5 rounded bg-muted text-xs">read:org</code>
                    </p>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo,read:org&description=Work+Intel+Team+Access"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Create a token on GitHub
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!token || !org || isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Github className="w-4 h-4 mr-2" />
                  )}
                  {isConnecting ? 'Connecting...' : 'Connect GitHub'}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* Step 1: Invite Team */}
        {currentStep === 1 && (
          <div>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Users className="w-6 h-6 text-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Invite Your Team</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add teammates so everyone can see the weekly report. You can always do this later.
              </p>
            </div>

            {sentInvites.length > 0 && (
              <div className="mb-4 space-y-1">
                {sentInvites.map((email, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>Invite sent to {email}</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  GitHub Username <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={inviteGithub}
                  onChange={e => setInviteGithub(e.target.value)}
                  placeholder="github-username"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button
                type="submit"
                disabled={!inviteEmail || isSending}
                className="w-full"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {isSending ? 'Sending...' : 'Send Invite'}
              </Button>
            </form>

            <div className="mt-4 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(0)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(2)}
              >
                {sentInvites.length > 0 ? 'Continue' : 'Skip for now'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: All Set */}
        {currentStep === 2 && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">You&apos;re All Set!</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {teamName} is ready to go. Generate your first weekly report to see AI-powered summaries
              of PRs merged, code reviews, and blockers across your team.
            </p>

            {/* Preview of what they'll get */}
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 mb-6 text-left">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                What you&apos;ll get
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <BarChart3 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Team velocity stats: PRs merged, open, and stuck</span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Per-member summaries with commits, reviews, and shipped work</span>
                </div>
                <div className="flex items-start gap-2">
                  <SkipForward className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Blockers and stuck PRs flagged automatically</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerateFirstReport}
              disabled={isGeneratingReport}
              className="w-full"
              size="lg"
            >
              {isGeneratingReport ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {isGeneratingReport ? 'Generating...' : 'Generate Your First Report'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Takes about 30 seconds</p>

            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
