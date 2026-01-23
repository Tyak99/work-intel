'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboardStore } from '@/lib/store';
import { useTheme } from '@/components/theme-provider';
import { GeneratedView } from '@/components/generative-ui/GeneratedView';
import { ActionProvider } from '@/lib/generative-ui/providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  RefreshCw,
  Send,
  X,
  Clock,
  ExternalLink,
  GitPullRequest,
  Mail,
  Calendar,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';

// Source icons mapping
const sourceIcons: Record<string, React.ReactNode> = {
  github: <GitPullRequest className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  jira: <CheckSquare className="h-4 w-4" />,
  alert: <AlertTriangle className="h-4 w-4" />,
};

// Urgency colors
const urgencyColors: Record<string, string> = {
  critical: 'border-l-red-500 bg-red-500/5',
  high: 'border-l-orange-500 bg-orange-500/5',
  medium: 'border-l-yellow-500 bg-yellow-500/5',
  low: 'border-l-blue-500 bg-blue-500/5',
};

interface Suggestion {
  id: string;
  title: string;
  subtitle?: string;
  reason: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  sourceId?: string;
  actions: Array<{
    label: string;
    action: { type: string; url?: string; sourceId?: string };
    variant?: string;
  }>;
}

export default function AIAssistantPage() {
  const router = useRouter();
  const { t, hasGlowEffects } = useTheme();
  const { user, isLoadingUser, fetchCurrentUser, brief, fetchLatestBrief, isGeneratingBrief, generateDailyBrief } = useDashboardStore();

  // Generated views state
  const [generatedViews, setGeneratedViews] = useState<any[]>([]);
  const [isGeneratingView, setIsGeneratingView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptValue, setPromptValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<'sonnet' | 'haiku'>('haiku');

  // Suggestions state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Map<string, number>>(new Map());

  // Fetch current user and brief on mount
  useEffect(() => {
    fetchCurrentUser().then((user) => {
      if (user) {
        fetchLatestBrief();
      }
    });
  }, [fetchCurrentUser, fetchLatestBrief]);

  // Fetch suggestions when brief changes
  useEffect(() => {
    if (brief) {
      fetchSuggestions();
    }
  }, [brief]);

  const fetchSuggestions = async () => {
    if (!brief) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/generative-ui/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Handle free-form prompt submission
  const handlePromptSubmit = async (prompt: string) => {
    if (!brief) {
      setError('Please generate a brief first to use AI prompts');
      return;
    }

    setIsGeneratingView(true);
    setError(null);

    try {
      const response = await fetch('/api/generative-ui/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, brief, model: selectedModel }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate view');
      }

      const data = await response.json();
      // Add new view to the top of the list
      setGeneratedViews(prev => [data.view, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate view');
    } finally {
      setIsGeneratingView(false);
    }
  };

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleSnooze = (id: string, minutes: number) => {
    const expiresAt = Date.now() + minutes * 60 * 1000;
    setSnoozedIds(prev => new Map(prev).set(id, expiresAt));
  };

  const handleAction = (action: { type: string; url?: string }) => {
    if (action.type === 'open_url' && action.url) {
      window.open(action.url, '_blank');
    }
  };

  const removeView = (viewId: string) => {
    setGeneratedViews(prev => prev.filter(v => v.id !== viewId));
  };

  // Filter visible suggestions
  const visibleSuggestions = suggestions.filter(s => {
    if (dismissedIds.has(s.id)) return false;
    const snoozedUntil = snoozedIds.get(s.id);
    if (snoozedUntil && snoozedUntil > Date.now()) return false;
    return true;
  });

  // Show loading state
  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none z-0" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-[128px] pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">{t('aiSuggestions')}</h1>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Beta</span>
              </div>
            </div>
            {!brief && (
              <Button
                onClick={() => generateDailyBrief()}
                disabled={isGeneratingBrief}
                className="gap-2"
              >
                {isGeneratingBrief ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Generate Brief First
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content - Side by side layout */}
      <main className="container mx-auto px-4 py-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)]">

          {/* LEFT SIDE - Input and Controls */}
          <div className="flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            {/* Intro Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Powered Work Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about your work and get custom views of your data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!brief ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Generate a daily brief first to enable AI features.</p>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    <p>Brief loaded: {new Date(brief.generatedAt).toLocaleTimeString()}</p>
                    <p className="mt-1">
                      {brief.prsToReview?.length || 0} PRs, {' '}
                      {brief.emailsToActOn?.length || 0} emails, {' '}
                      {brief.meetings?.length || 0} meetings, {' '}
                      {brief.jiraTasks?.length || 0} tasks
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Input */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('askAnything')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (promptValue.trim()) {
                      handlePromptSubmit(promptValue);
                      setPromptValue('');
                    }
                  }}
                  className="flex gap-2"
                >
                  <div className="flex-1 flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                    <Input
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      placeholder={brief ? t('askAnything') : 'Generate a brief first...'}
                      disabled={!brief || isGeneratingView}
                      className="flex-1 border-0 bg-transparent focus-visible:ring-0 h-auto py-0"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!brief || !promptValue.trim() || isGeneratingView}
                    className="gap-2"
                  >
                    {isGeneratingView ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Generate
                  </Button>
                </form>

                {/* Model selector */}
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Model:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('haiku')}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      selectedModel === 'haiku'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    Haiku (Fast)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedModel('sonnet')}
                    className={`px-3 py-1 rounded-full transition-colors ${
                      selectedModel === 'sonnet'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    Sonnet (Smart)
                  </button>
                </div>


                {error && (
                  <div className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Proactive Suggestions */}
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    Proactive Suggestions
                    {visibleSuggestions.length > 0 && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        {visibleSuggestions.length}
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchSuggestions}
                    disabled={isLoadingSuggestions || !brief}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <CardDescription>
                  AI-generated action items based on your brief
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingSuggestions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : visibleSuggestions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No suggestions at the moment</p>
                    {!brief && <p className="text-sm mt-1">Generate a brief to get suggestions</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`relative rounded-lg border-l-4 p-3 ${urgencyColors[suggestion.urgency]} transition-all hover:shadow-sm`}
                      >
                        {/* Dismiss button */}
                        <button
                          onClick={() => handleDismiss(suggestion.id)}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>

                        {/* Header */}
                        <div className="flex items-start gap-2 pr-6">
                          <div className="text-muted-foreground mt-0.5">
                            {sourceIcons[suggestion.source] || sourceIcons.alert}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{suggestion.title}</div>
                            {suggestion.subtitle && (
                              <div className="text-xs text-muted-foreground truncate">
                                {suggestion.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                          {suggestion.reason}
                        </div>

                        {/* Actions */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {suggestion.actions.slice(0, 2).map((action, i) => (
                            <Button
                              key={i}
                              variant={action.variant === 'primary' ? 'default' : 'secondary'}
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => handleAction(action.action)}
                            >
                              {action.label}
                            </Button>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleSnooze(suggestion.id, 60)}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Snooze
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE - Generated Content */}
          <div className="flex flex-col gap-4 overflow-y-auto pl-2 custom-scrollbar">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {t('generatedView')}
                {generatedViews.length > 0 && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                    {generatedViews.length}
                  </span>
                )}
              </h2>
              {generatedViews.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGeneratedViews([])}
                  className="text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            {generatedViews.length === 0 ? (
              <Card className="flex-1 flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Generated views will appear here</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Try asking a question or use a quick prompt
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ActionProvider>
                <div className="space-y-4">
                  {generatedViews.map((view) => (
                    <Card key={view.id} className={hasGlowEffects ? 'shadow-lg shadow-primary/5' : ''}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base">{view.title}</CardTitle>
                            {view.description && (
                              <CardDescription>{view.description}</CardDescription>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeView(view.id)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Prompt: "{view.prompt}"
                        </p>
                      </CardHeader>
                      <CardContent>
                        <GeneratedView view={view} variant="inline" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ActionProvider>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
