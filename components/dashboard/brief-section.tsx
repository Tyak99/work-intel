'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Target, Calendar, Eye, Mail, AlertTriangle, Sparkles, Clock, Users, ClipboardCheck, ArrowRight, Activity, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Brief, BriefAlert, BriefListItem, MeetingItem } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme-provider';
import { ThemeLabelKey } from '@/lib/theme-config';

interface BriefSectionProps {
  brief: Brief | null;
  isGenerating: boolean;
}

const sectionIcons = {
  focus: Target,
  meetings: Calendar,
  prsToReview: Eye,
  myPrsWaiting: ClipboardCheck,
  emails: Mail,
  jira: Activity,
  alerts: AlertTriangle,
  notes: Sparkles,
};

// Updated color system - using CSS variables and tailwind classes for neon effects
const sectionStyles = {
  focus: {
    border: 'border-l-neon-pink', 
    icon: 'text-neon-pink',
    bg: 'bg-neon-pink/5 hover:bg-neon-pink/10',
    glow: 'shadow-[inset_0_0_20px_rgba(236,72,153,0.05)]'
  },
  meetings: {
    border: 'border-l-neon-blue',
    icon: 'text-neon-blue',
    bg: 'bg-neon-blue/5 hover:bg-neon-blue/10',
    glow: 'shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]'
  },
  prsToReview: {
    border: 'border-l-neon-cyan',
    icon: 'text-neon-cyan',
    bg: 'bg-neon-cyan/5 hover:bg-neon-cyan/10',
    glow: 'shadow-[inset_0_0_20px_rgba(6,182,212,0.05)]'
  },
  myPrsWaiting: {
    border: 'border-l-neon-purple',
    icon: 'text-neon-purple',
    bg: 'bg-neon-purple/5 hover:bg-neon-purple/10',
    glow: 'shadow-[inset_0_0_20px_rgba(139,92,246,0.05)]'
  },
  emails: {
    border: 'border-l-neon-green',
    icon: 'text-neon-green',
    bg: 'bg-neon-green/5 hover:bg-neon-green/10',
    glow: 'shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]'
  },
  jira: {
    border: 'border-l-neon-amber',
    icon: 'text-neon-amber',
    bg: 'bg-neon-amber/5 hover:bg-neon-amber/10',
    glow: 'shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]'
  },
  alerts: {
    border: 'border-l-neon-red',
    icon: 'text-neon-red',
    bg: 'bg-neon-red/5 hover:bg-neon-red/10',
    glow: 'shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]'
  },
  notes: {
    border: 'border-l-slate-400',
    icon: 'text-slate-400',
    bg: 'bg-slate-500/5 hover:bg-slate-500/10',
    glow: 'shadow-[inset_0_0_20px_rgba(148,163,184,0.05)]'
  },
};

export function BriefSection({ brief, isGenerating }: BriefSectionProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { t, hasAnimations, hasGlowEffects } = useTheme();

  const { smartTodos, toggleTodoExpanded } = useDashboardStore();

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Helper to find corresponding smart todo for an item
  const findSmartTodo = (briefItemId: string) => {
    return smartTodos.find(t => t.briefItemId === briefItemId);
  };

  // Helper to scroll to and expand todo
  const scrollToTodo = (briefItemId: string) => {
    const todo = findSmartTodo(briefItemId);
    if (todo) {
      // Expand the todo
      toggleTodoExpanded(todo.id);

      // Scroll to the todo section after a short delay to allow DOM update
      setTimeout(() => {
        const todoElement = document.getElementById(`smart-todo-${todo.id}`);
        if (todoElement) {
          todoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback: scroll to the todo section
          const todoSection = document.querySelector('[data-todo-section]');
          if (todoSection) {
            todoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 100);
    }
  };

  const sections = useMemo(() => {
    if (!brief) return [];

    const legacyItems = (brief.sections || [])
      .flatMap(section => section.items.map(item => ({
        title: item.title,
        summary: item.description,
        priority: item.priority || 'medium',
        sourceId: item.sourceId || section.id,
      })));

    return [
      {
        id: 'focus',
        title: t('topFocus'),
        icon: sectionIcons.focus,
        style: sectionStyles.focus,
        count: brief.topFocus?.length || 0,
        content: brief.topFocus && brief.topFocus.length > 0 ? (
          <div className="space-y-3">
            {brief.topFocus.map(item => (
              <div key={item.rank} className="p-4 bg-background/40 backdrop-blur-sm rounded-lg border border-neon-pink/20 hover:border-neon-pink/40 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neon-pink/20 text-[10px] font-bold text-neon-pink ring-1 ring-neon-pink/50">
                      {item.rank}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-neon-pink/30 text-neon-pink bg-neon-pink/5">
                      {t('priorityTarget')}
                    </Badge>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">{item.relatedItemId}</Badge>
                </div>
                <h4 className="font-medium text-sm text-foreground group-hover:text-neon-pink transition-colors">{item.title}</h4>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{item.reason}</p>
              </div>
            ))}
          </div>
        ) : null
      },
      {
        id: 'meetings',
        title: t('meetings'),
        icon: sectionIcons.meetings,
        style: sectionStyles.meetings,
        count: brief.meetings?.length || 0,
        items: brief.meetings || [],
        hasAIAction: true,
      },
      {
        id: 'prsToReview',
        title: t('pendingReview'),
        icon: sectionIcons.prsToReview,
        style: sectionStyles.prsToReview,
        count: brief.prsToReview?.length || 0,
        items: brief.prsToReview || [],
        hasAIAction: false,
      },
      {
        id: 'myPrsWaiting',
        title: t('myPrs'),
        icon: sectionIcons.myPrsWaiting,
        style: sectionStyles.myPrsWaiting,
        count: brief.myPrsWaiting?.length || 0,
        items: brief.myPrsWaiting || [],
        hasAIAction: true,
      },
      {
        id: 'emails',
        title: t('emails'),
        icon: sectionIcons.emails,
        style: sectionStyles.emails,
        count: brief.emailsToActOn?.length || 0,
        items: brief.emailsToActOn || [],
        hasAIAction: true,
      },
      {
        id: 'jira',
        title: t('jiraTasks'),
        icon: sectionIcons.jira,
        style: sectionStyles.jira,
        count: brief.jiraTasks?.length || 0,
        items: brief.jiraTasks || [],
        hasAIAction: false,
      },
      {
        id: 'alerts',
        title: t('alerts'),
        icon: sectionIcons.alerts,
        style: sectionStyles.alerts,
        count: brief.alerts?.length || 0,
        alerts: brief.alerts || [],
        hasAIAction: false,
      },
      {
        id: 'notes',
        title: t('notes'),
        icon: sectionIcons.notes,
        style: sectionStyles.notes,
        count: legacyItems.length,
        legacyItems,
        hasAIAction: false,
      }
    ];
  }, [brief, t]);

  const hasContent = sections.some(section => section.count > 0);

  const expandAll = () => {
    setExpandedSections(new Set(sections.filter(section => section.count > 0).map(section => section.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  if (isGenerating) {
    return (
      <Card className="glass-panel border-primary/20 shadow-glow-sm relative overflow-hidden">
        {hasAnimations && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-scan-line" />}
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary animate-pulse" />
              {t('initializing')}
            </span>
            <div className="flex items-center space-x-2 text-sm text-primary">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span>{t('generatingBrief')}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse flex flex-col gap-2">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-16 bg-muted rounded border border-border" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!brief) {
    return (
      <Card className="glass-panel border-border">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-6 group">
            {hasGlowEffects && <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>}
            <div className="relative w-24 h-24 bg-card rounded-full flex items-center justify-center border border-border">
              <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground mb-2">
            {t('emptyBrief')}
          </h3>
          <p className="text-muted-foreground max-w-md text-sm">
            {t('emptyBriefSubtext')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-white/10">
      <CardHeader className="border-b border-white/5 bg-black/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t('briefTitle')}
            </CardTitle>
            <p className="text-xs font-mono text-primary/70 mt-1 uppercase tracking-wider">
              Generated: {new Date(brief.generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="text-xs h-7"
              disabled={!hasContent}
            >
              {t('expandAll')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-xs h-7"
              disabled={!hasContent}
            >
              {t('collapseAll')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {sections.filter(section => section.count > 0).map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.id);
          const style = section.style;

          // Render section content based on type
          const renderSectionContent = () => {
            if (section.id === 'focus') {
              return section.content;
            }
            if (section.id === 'meetings' && 'items' in section) {
              return renderMeetings(
                section.items as MeetingItem[],
                findSmartTodo,
                scrollToTodo,
                style,
                t
              );
            }
            if (section.id === 'alerts' && 'alerts' in section) {
              return renderAlerts(section.alerts as BriefAlert[], style);
            }
            if (section.id === 'notes' && 'legacyItems' in section) {
              const items = section.legacyItems as Array<{ title: string; summary: string; priority: string; sourceId: string }>;
              return items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={`${item.sourceId}-${index}`} className="p-3 bg-background/40 backdrop-blur-sm rounded-lg border border-white/10">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm font-mono text-slate-300">{item.title}</h4>
                        <Badge variant="outline" className="text-[10px]">{item.priority}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : null;
            }
            if ('items' in section && section.hasAIAction) {
              return renderBriefItemsWithTodoLink(
                section.items as BriefListItem[],
                findSmartTodo,
                scrollToTodo,
                style,
                t
              );
            }
            if ('items' in section) {
              return renderBriefItems(section.items as BriefListItem[], style);
            }
            return null;
          };

          return (
            <div 
              key={section.id} 
              className={cn(
                "rounded-lg transition-all duration-300 border-l-4",
                style.border,
                style.bg,
                isExpanded ? "bg-opacity-100" : "bg-opacity-50"
              )}
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn("p-2 rounded bg-black/20 ring-1 ring-white/5", style.icon)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-display font-medium text-left tracking-wide text-sm">{section.title}</h3>
                  <Badge variant="secondary" className="text-[10px] bg-black/40 border-white/10 font-mono">
                    {section.count.toString().padStart(2, '0')}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </button>

              {isExpanded && (
                <div className={cn("px-4 pb-4 animate-accordion-down overflow-hidden")}>
                  <Separator className="mb-4 bg-white/5" />
                  {renderSectionContent()}
                </div>
              )}
            </div>
          );
        })}

        {brief.summary && (
          <div className="mt-6 p-5 bg-muted/30 rounded-lg border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Activity className="w-24 h-24" />
            </div>
            <h3 className="font-display font-semibold text-sm mb-3 text-primary">{t('missionSummary')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{brief.summary}</p>
          </div>
        )}

        {!hasContent && (
          <div className="text-sm text-muted-foreground text-center py-8">{t('emptyBriefSubtext')}</div>
        )}
      </CardContent>
    </Card>
  );
}

type FindSmartTodoFn = (briefItemId: string) => { id: string; status: string } | undefined;
type ScrollToTodoFn = (briefItemId: string) => void;
type TranslateFn = (key: ThemeLabelKey) => string;

function renderMeetings(
  meetings: MeetingItem[],
  findSmartTodo: FindSmartTodoFn,
  scrollToTodo: ScrollToTodoFn,
  style: any,
  t: TranslateFn
) {
  if (meetings.length === 0) return null;

  return (
    <div className="space-y-3">
      {meetings.map(meeting => {
        const smartTodo = findSmartTodo(meeting.id);
        const hasTodo = !!smartTodo;

        return (
          <div key={meeting.id} className={cn("p-4 bg-background/40 rounded-lg border border-border transition-colors hover:border-primary/30", style.glow)}>
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-foreground">
                {meeting.url ? (
                  <a
                    href={meeting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {meeting.title}
                  </a>
                ) : (
                  meeting.title
                )}
              </h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-500 bg-blue-500/10">
                  <Clock className="w-3 h-3 mr-1" />
                  {meeting.time}
                </Badge>
              </div>
            </div>
            {meeting.prepNeeded && (
              <div className="mt-2 flex items-start gap-2">
                 <Badge variant="secondary" className="text-[10px] px-1 h-5 mt-0.5 bg-blue-500/10 text-blue-500">{t('prepNotesLabel')}</Badge>
                 <p className="text-xs text-muted-foreground">{meeting.prepNeeded}</p>
              </div>
            )}
            {meeting.attendees.length > 0 && (
              <div className="flex items-center text-xs text-muted-foreground mt-2">
                <Users className="w-3 h-3 mr-1" />
                {meeting.attendees.slice(0, 4).join(', ')}{meeting.attendees.length > 4 ? '...' : ''}
              </div>
            )}
            {/* Link to Todo */}
            {hasTodo && (
              <button
                onClick={() => scrollToTodo(meeting.id)}
                className="mt-3 text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium"
              >
                <ArrowRight className="w-3 h-3" />
                {t('viewTodo')}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderBriefItemsWithTodoLink(
  items: BriefListItem[],
  findSmartTodo: FindSmartTodoFn,
  scrollToTodo: ScrollToTodoFn,
  style: any,
  t: TranslateFn
) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map(item => {
        const smartTodo = findSmartTodo(item.id);
        const hasTodo = !!smartTodo;

        return (
          <div key={item.id} className={cn("p-4 bg-background/40 rounded-lg border border-border hover:border-primary/30 transition-all", style.glow)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1 text-foreground">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors"
                    >
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                {item.context && (
                  <div className="mt-2 p-2 bg-muted/50 rounded border border-border text-[10px] text-muted-foreground">
                     {item.context}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant={item.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {item.priority}
                  </Badge>
                  {item.actionType && (
                    <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{item.actionType}</Badge>
                  )}
                  {item.deadline && (
                    <Badge variant="outline" className="text-[10px] border-border">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.deadline}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize border-border text-muted-foreground">
                    {item.source}
                  </Badge>
                </div>

                {/* Link to Todo instead of inline action button */}
                {hasTodo && (
                  <button
                    onClick={() => scrollToTodo(item.id)}
                    className="mt-3 text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium"
                  >
                    <ArrowRight className="w-3 h-3" />
                    {t('viewTodo')}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderBriefItems(items: BriefListItem[], style: any) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className={cn("p-4 bg-background/40 rounded-lg border border-border hover:border-primary/30 transition-all", style.glow)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1 text-foreground">
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </h4>
              <p className="text-xs text-muted-foreground">{item.summary}</p>
              {item.context && (
                <p className="text-xs text-muted-foreground mt-2">{item.context}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant={item.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {item.priority}
                </Badge>
                {item.actionType && (
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">{item.actionType}</Badge>
                )}
                <Badge variant="outline" className="text-[10px] capitalize border-border text-muted-foreground">
                  {item.source}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderAlerts(alerts: BriefAlert[], style: any) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <div key={alert.sourceId} className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-destructive">{alert.title}</h4>
            <Badge variant="destructive" className="text-[10px]">{alert.type.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xs text-destructive/80 mt-2">{alert.description}</p>
        </div>
      ))}
    </div>
  );
}
