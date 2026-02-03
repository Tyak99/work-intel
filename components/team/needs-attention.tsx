'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';

interface NeedsAttentionItem {
  type: string;
  title: string;
  url: string;
  repo: string;
  author: string;
  daysSinceUpdate: number;
  reason: string;
}

interface NeedsAttentionProps {
  items: NeedsAttentionItem[];
}

export function NeedsAttention({ items }: NeedsAttentionProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        Needs Attention ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 font-medium">
                  {item.type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-muted-foreground">{item.repo}</span>
                <span className="text-xs text-muted-foreground">by {item.author}</span>
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-primary transition-colors font-medium flex items-center gap-1"
              >
                {item.title}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
              <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-medium text-muted-foreground">
                {item.daysSinceUpdate}d stale
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
