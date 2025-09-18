'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Target, Calendar, Eye, Mail, RotateCcw, AlertTriangle, Lightbulb, Sparkles, Link2, Clock, Zap, Users, Brain } from 'lucide-react';
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
                  {section.sectionInsights && (
                    <div className="mb-4 p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start space-x-2">
                        <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">{section.sectionInsights}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {section.items.map((item, index) => (
                      <div key={index} className="p-4 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-2">{item.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                              {item.description}
                            </p>
                            
                            {/* Metadata row */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              {item.priority && (
                                <Badge 
                                  variant={item.priority === 'critical' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {item.priority}
                                </Badge>
                              )}
                              {item.effort && (
                                <Badge variant="outline" className="text-xs">
                                  <Zap className="w-3 h-3 mr-1" />
                                  {item.effort}
                                </Badge>
                              )}
                              {item.deadline && (
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {item.deadline}
                                </Badge>
                              )}
                              {item.blockingImpact && (
                                <Badge variant="outline" className="text-xs text-orange-700 dark:text-orange-300">
                                  <Users className="w-3 h-3 mr-1" />
                                  Blocking: {item.blockingImpact}
                                </Badge>
                              )}
                            </div>

                            {/* Correlations */}
                            {item.correlations && item.correlations.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                                  <Link2 className="w-3 h-3 mr-1" />
                                  Related Items
                                </h5>
                                <div className="space-y-1">
                                  {item.correlations.map((correlation, corrIndex) => (
                                    <div key={corrIndex} className="flex items-center space-x-2 text-xs">
                                      <div className={`w-2 h-2 rounded-full ${
                                        correlation.confidence > 0.8 ? 'bg-green-500' : 
                                        correlation.confidence > 0.6 ? 'bg-yellow-500' : 'bg-gray-500'
                                      }`} />
                                      <span className="text-slate-600 dark:text-slate-400">
                                        {correlation.relatedSource}: {correlation.relatedId} ({correlation.reason})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* AI Insights */}
                            {item.aiInsights && (
                              <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/30 rounded border border-indigo-200 dark:border-indigo-800">
                                <div className="flex items-start space-x-2">
                                  <Lightbulb className="w-3 h-3 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-indigo-800 dark:text-indigo-200">{item.aiInsights}</p>
                                </div>
                              </div>
                            )}
                          </div>
                          {item.url && (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                <polyline points="15,3 21,3 21,9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                            </a>
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
        
        {/* Overall Insights */}
        {brief.overallInsights && (
          <div className="mt-6 p-4 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-lg border border-violet-200 dark:border-violet-800">
            <h3 className="font-medium text-sm mb-3 flex items-center text-violet-900 dark:text-violet-100">
              <Brain className="w-4 h-4 mr-2" />
              AI Analysis Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {brief.overallInsights.hiddenTasksFound > 0 && (
                <div>
                  <span className="font-medium text-violet-800 dark:text-violet-200">Hidden Tasks Discovered:</span>
                  <p className="text-violet-700 dark:text-violet-300">{brief.overallInsights.hiddenTasksFound} action items found in comments and descriptions</p>
                </div>
              )}
              
              {brief.overallInsights.criticalCorrelations.length > 0 && (
                <div>
                  <span className="font-medium text-violet-800 dark:text-violet-200">Key Relationships:</span>
                  <ul className="text-violet-700 dark:text-violet-300 mt-1 space-y-1">
                    {brief.overallInsights.criticalCorrelations.slice(0, 3).map((correlation, index) => (
                      <li key={index}>• {correlation}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {brief.overallInsights.workPatterns.length > 0 && (
                <div>
                  <span className="font-medium text-violet-800 dark:text-violet-200">Patterns Detected:</span>
                  <ul className="text-violet-700 dark:text-violet-300 mt-1 space-y-1">
                    {brief.overallInsights.workPatterns.slice(0, 2).map((pattern, index) => (
                      <li key={index}>• {pattern}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {brief.overallInsights.recommendations.length > 0 && (
                <div>
                  <span className="font-medium text-violet-800 dark:text-violet-200">AI Recommendations:</span>
                  <ul className="text-violet-700 dark:text-violet-300 mt-1 space-y-1">
                    {brief.overallInsights.recommendations.slice(0, 2).map((recommendation, index) => (
                      <li key={index}>• {recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}