'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Target, Calendar, Eye, Mail, RotateCcw, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Brief, BriefSection as BriefSectionType } from '@/lib/types';

interface BriefSectionProps {
  brief: Brief | null;
  isGenerating: boolean;
}

const sectionIcons = {
  critical: Target,
  meetings: Calendar,
  reviews: Eye,
  emails: Mail,
  progress: RotateCcw,
  risks: AlertTriangle,
  observations: Lightbulb,
};

const sectionColors = {
  critical: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  meetings: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  reviews: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
  emails: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  progress: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
  risks: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
  observations: 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800',
};

export function BriefSection({ brief, isGenerating }: BriefSectionProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const expandAll = () => {
    if (brief) {
      setExpandedSections(new Set(brief.sections.map(s => s.id)));
    }
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
            >
              Expand All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="text-xs"
            >
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {brief.sections.map((section) => {
          const Icon = sectionIcons[section.type as keyof typeof sectionIcons] || Sparkles;
          const isExpanded = expandedSections.has(section.id);
          
          return (
            <div key={section.id} className={`border rounded-lg ${sectionColors[section.type as keyof typeof sectionColors] || 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5" />
                  <h3 className="font-medium text-left">{section.title}</h3>
                  {section.items.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {section.items.length}
                    </Badge>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              
              {isExpanded && section.items.length > 0 && (
                <div className="px-4 pb-4">
                  <Separator className="mb-4" />
                  <div className="space-y-3">
                    {section.items.map((item, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-white/50 dark:bg-slate-800/50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {item.description}
                          </p>
                          {item.priority && (
                            <Badge 
                              variant={item.priority === 'critical' ? 'destructive' : 'secondary'}
                              className="mt-2 text-xs"
                            >
                              {item.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}