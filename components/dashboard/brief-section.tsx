'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Target, Calendar, Eye, Mail, AlertTriangle, Sparkles, Clock, Users, ClipboardCheck, ArrowRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Brief, BriefAlert, BriefListItem, MeetingItem } from '@/lib/types';
import { useDashboardStore } from '@/lib/store';

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
  jira: ClipboardCheck,
  alerts: AlertTriangle,
  notes: Sparkles,
};

const sectionColors = {
  focus: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800',
  meetings: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  prsToReview: 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800',
  myPrsWaiting: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
  emails: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  jira: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  alerts: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  notes: 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800',
};

export function BriefSection({ brief, isGenerating }: BriefSectionProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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
        title: 'Top Focus',
        icon: sectionIcons.focus,
        color: sectionColors.focus,
        count: brief.topFocus?.length || 0,
        content: brief.topFocus && brief.topFocus.length > 0 ? (
          <div className="space-y-3">
            {brief.topFocus.map(item => (
              <div key={item.rank} className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-rose-200 dark:border-rose-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-rose-600 dark:text-rose-300">Priority {item.rank}</p>
                    <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.title}</h4>
                  </div>
                  <Badge variant="secondary" className="text-xs">{item.relatedItemId}</Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{item.reason}</p>
              </div>
            ))}
          </div>
        ) : null
      },
      {
        id: 'meetings',
        title: 'Meetings',
        icon: sectionIcons.meetings,
        color: sectionColors.meetings,
        count: brief.meetings?.length || 0,
        items: brief.meetings || [],
        hasAIAction: true,
      },
      {
        id: 'prsToReview',
        title: 'PRs To Review',
        icon: sectionIcons.prsToReview,
        color: sectionColors.prsToReview,
        count: brief.prsToReview?.length || 0,
        items: brief.prsToReview || [],
        hasAIAction: false,
      },
      {
        id: 'myPrsWaiting',
        title: 'My PRs Waiting',
        icon: sectionIcons.myPrsWaiting,
        color: sectionColors.myPrsWaiting,
        count: brief.myPrsWaiting?.length || 0,
        items: brief.myPrsWaiting || [],
        hasAIAction: true,
      },
      {
        id: 'emails',
        title: 'Emails To Act On',
        icon: sectionIcons.emails,
        color: sectionColors.emails,
        count: brief.emailsToActOn?.length || 0,
        items: brief.emailsToActOn || [],
        hasAIAction: true,
      },
      {
        id: 'jira',
        title: 'Jira Tasks',
        icon: sectionIcons.jira,
        color: sectionColors.jira,
        count: brief.jiraTasks?.length || 0,
        items: brief.jiraTasks || [],
        hasAIAction: false,
      },
      {
        id: 'alerts',
        title: 'Alerts',
        icon: sectionIcons.alerts,
        color: sectionColors.alerts,
        count: brief.alerts?.length || 0,
        alerts: brief.alerts || [],
        hasAIAction: false,
      },
      {
        id: 'notes',
        title: 'Notes',
        icon: sectionIcons.notes,
        color: sectionColors.notes,
        count: legacyItems.length,
        legacyItems,
        hasAIAction: false,
      }
    ];
  }, [brief]);

  const hasContent = sections.some(section => section.count > 0);

  const expandAll = () => {
    setExpandedSections(new Set(sections.filter(section => section.count > 0).map(section => section.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  if (isGenerating) {
    return (
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daily Brief</span>
            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" />
              Analyzing your work data...
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!brief) {
    return (
      <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Ready to generate your daily brief
          </h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md">
            Click "Generate Brief" to analyze your work data and get AI-powered insights and task prioritization.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Daily Brief</CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Generated: {new Date(brief.generatedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="text-xs"
              disabled={!hasContent}
            >
              Expand All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-xs"
              disabled={!hasContent}
            >
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.filter(section => section.count > 0).map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.id);

          // Render section content based on type
          const renderSectionContent = () => {
            if (section.id === 'focus') {
              return section.content;
            }
            if (section.id === 'meetings' && 'items' in section) {
              return renderMeetings(
                section.items as MeetingItem[],
                findSmartTodo,
                scrollToTodo
              );
            }
            if (section.id === 'alerts' && 'alerts' in section) {
              return renderAlerts(section.alerts as BriefAlert[]);
            }
            if (section.id === 'notes' && 'legacyItems' in section) {
              const items = section.legacyItems as Array<{ title: string; summary: string; priority: string; sourceId: string }>;
              return items.length > 0 ? (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={`${item.sourceId}-${index}`} className="p-3 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{item.title}</h4>
                        <Badge variant="outline" className="text-xs">{item.priority}</Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : null;
            }
            if ('items' in section && section.hasAIAction) {
              return renderBriefItemsWithTodoLink(
                section.items as BriefListItem[],
                findSmartTodo,
                scrollToTodo
              );
            }
            if ('items' in section) {
              return renderBriefItems(section.items as BriefListItem[]);
            }
            return null;
          };

          return (
            <div key={section.id} className={`border rounded-lg ${section.color}`}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <h3 className="font-medium text-left">{section.title}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {section.count}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4">
                  <Separator className="mb-4" />
                  {renderSectionContent()}
                </div>
              )}
            </div>
          );
        })}

        {brief.summary && (
          <div className="mt-4 p-4 bg-slate-50/70 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="font-medium text-sm mb-2 text-slate-900 dark:text-slate-100">Summary</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{brief.summary}</p>
          </div>
        )}

        {!hasContent && (
          <div className="text-sm text-slate-500 dark:text-slate-400">No brief items found for today.</div>
        )}
      </CardContent>
    </Card>
  );
}

type FindSmartTodoFn = (briefItemId: string) => { id: string; status: string } | undefined;
type ScrollToTodoFn = (briefItemId: string) => void;

function renderMeetings(
  meetings: MeetingItem[],
  findSmartTodo: FindSmartTodoFn,
  scrollToTodo: ScrollToTodoFn
) {
  if (meetings.length === 0) return null;

  return (
    <div className="space-y-3">
      {meetings.map(meeting => {
        const smartTodo = findSmartTodo(meeting.id);
        const hasTodo = !!smartTodo;

        return (
          <div key={meeting.id} className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{meeting.title}</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {meeting.time}
                </Badge>
              </div>
            </div>
            {meeting.prepNeeded && (
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">Prep: {meeting.prepNeeded}</p>
            )}
            {meeting.attendees.length > 0 && (
              <div className="flex items-center text-xs text-slate-600 dark:text-slate-400 mt-2">
                <Users className="w-3 h-3 mr-1" />
                {meeting.attendees.slice(0, 4).join(', ')}{meeting.attendees.length > 4 ? '...' : ''}
              </div>
            )}
            {/* Link to Todo */}
            {hasTodo && (
              <button
                onClick={() => scrollToTodo(meeting.id)}
                className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                View in Todos
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
  scrollToTodo: ScrollToTodoFn
) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map(item => {
        const smartTodo = findSmartTodo(item.id);
        const hasTodo = !!smartTodo;

        return (
          <div key={item.id} className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">{item.summary}</p>
                {item.context && (
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{item.context}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge variant={item.priority === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                    {item.priority}
                  </Badge>
                  {item.actionType && (
                    <Badge variant="outline" className="text-xs">{item.actionType}</Badge>
                  )}
                  {item.deadline && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {item.deadline}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.source} - {item.sourceId}
                  </Badge>
                </div>

                {/* Link to Todo instead of inline action button */}
                {hasTodo && (
                  <button
                    onClick={() => scrollToTodo(item.id)}
                    className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                    View in Todos
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

function renderBriefItems(items: BriefListItem[]) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.id} className="p-4 bg-white/60 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">{item.summary}</p>
              {item.context && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">{item.context}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant={item.priority === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                  {item.priority}
                </Badge>
                {item.actionType && (
                  <Badge variant="outline" className="text-xs">{item.actionType}</Badge>
                )}
                {item.deadline && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {item.deadline}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {item.source} - {item.sourceId}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function renderAlerts(alerts: BriefAlert[]) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <div key={alert.sourceId} className="p-4 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-red-900 dark:text-red-100">{alert.title}</h4>
            <Badge variant="destructive" className="text-xs">{alert.type.replace('_', ' ')}</Badge>
          </div>
          <p className="text-xs text-red-800 dark:text-red-200 mt-2">{alert.description}</p>
        </div>
      ))}
    </div>
  );
}
