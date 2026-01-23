'use client';

// Component Registry - Maps component types to React components
// This is where the actual rendering happens

import React from 'react';
import {
  Card as ShadcnCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  GitPullRequest,
  Mail,
  Calendar,
  CheckSquare,
  ExternalLink,
  Copy,
  Clock,
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { UINode, ActionPayload, Suggestion } from './types';

// === Action Handler Type ===
export type ActionHandler = (action: ActionPayload) => void | Promise<void>;

// === Component Props Context ===
interface RenderContext {
  onAction: ActionHandler;
  data?: Record<string, any>;
}

// === Source Icons ===
const sourceIcons: Record<string, React.ReactNode> = {
  github: <GitPullRequest className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  calendar: <Calendar className="h-4 w-4" />,
  jira: <CheckSquare className="h-4 w-4" />,
};

// === Urgency Colors ===
const urgencyColors: Record<string, string> = {
  critical: 'border-red-500/50 bg-red-500/10',
  high: 'border-orange-500/50 bg-orange-500/10',
  medium: 'border-yellow-500/50 bg-yellow-500/10',
  low: 'border-blue-500/50 bg-blue-500/10',
};

// === Priority Badge Variants ===
const priorityVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

// === Alert Icons ===
const alertIcons: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  success: <CheckCircle className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

// === Trend Icons ===
const trendIcons: Record<string, React.ReactNode> = {
  up: <TrendingUp className="h-4 w-4 text-green-500" />,
  down: <TrendingDown className="h-4 w-4 text-red-500" />,
  stable: <Minus className="h-4 w-4 text-muted-foreground" />,
};

// === Component Implementations ===

function TextComponent({ content, variant = 'body', color = 'default' }: {
  content: string;
  variant?: 'body' | 'heading' | 'subheading' | 'caption' | 'code';
  color?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'error';
}) {
  const variantClasses: Record<string, string> = {
    body: 'text-sm',
    heading: 'text-xl font-semibold',
    subheading: 'text-lg font-medium',
    caption: 'text-xs text-muted-foreground',
    code: 'font-mono text-sm bg-muted px-1 py-0.5 rounded',
  };

  const colorClasses: Record<string, string> = {
    default: 'text-foreground',
    muted: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
  };

  return (
    <span className={cn(variantClasses[variant], colorClasses[color])}>
      {content}
    </span>
  );
}

function BadgeComponent({ label, variant = 'default' }: {
  label: string;
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
}) {
  // Map custom variants to shadcn variants
  const shadcnVariant = variant === 'success' || variant === 'warning'
    ? 'secondary'
    : variant;

  const customClass = variant === 'success'
    ? 'bg-green-500/20 text-green-500'
    : variant === 'warning'
    ? 'bg-yellow-500/20 text-yellow-500'
    : '';

  return (
    <Badge variant={shadcnVariant} className={customClass}>
      {label}
    </Badge>
  );
}

function MetricComponent({ label, value, format, trend, trendValue }: {
  label: string;
  value: string | number;
  format?: 'number' | 'percentage' | 'duration' | 'date';
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}) {
  const formatValue = (val: string | number) => {
    if (format === 'percentage') return `${val}%`;
    if (format === 'duration') return val;
    if (format === 'date') return val;
    return val;
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold">{formatValue(value)}</span>
        {trend && (
          <div className="flex items-center gap-1">
            {trendIcons[trend]}
            {trendValue && <span className="text-xs">{trendValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButtonComponent({
  label,
  action,
  variant = 'default',
  icon,
  disabled,
  onAction
}: {
  label: string;
  action: ActionPayload;
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive';
  icon?: string;
  confirmRequired?: boolean;
  disabled?: boolean;
  onAction: ActionHandler;
}) {
  const handleClick = () => {
    onAction(action);
  };

  // Map variants
  const buttonVariant = variant === 'primary' ? 'default' : variant;

  return (
    <Button
      variant={buttonVariant}
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      className="gap-1"
    >
      {icon === 'external' && <ExternalLink className="h-3 w-3" />}
      {icon === 'copy' && <Copy className="h-3 w-3" />}
      {icon === 'clock' && <Clock className="h-3 w-3" />}
      {icon === 'x' && <X className="h-3 w-3" />}
      {label}
    </Button>
  );
}

function AlertComponent({ type, title, message }: {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}) {
  const variantMap: Record<string, 'default' | 'destructive'> = {
    info: 'default',
    success: 'default',
    warning: 'default',
    error: 'destructive',
  };

  return (
    <Alert variant={variantMap[type]}>
      {alertIcons[type]}
      <AlertTitle>{title}</AlertTitle>
      {message && <AlertDescription>{message}</AlertDescription>}
    </Alert>
  );
}

function CardComponent({
  title,
  description,
  source,
  priority,
  url,
  metadata,
  onAction,
  children
}: {
  title: string;
  description?: string;
  source?: string;
  sourceId?: string;
  priority?: string;
  url?: string;
  metadata?: Record<string, string>;
  onAction: ActionHandler;
  children?: React.ReactNode;
}) {
  return (
    <ShadcnCard className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {source && sourceIcons[source]}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {priority && (
            <Badge variant={priorityVariants[priority] || 'secondary'}>
              {priority}
            </Badge>
          )}
        </div>
        {description && (
          <CardDescription className="line-clamp-2">{description}</CardDescription>
        )}
      </CardHeader>
      {(children || metadata || url) && (
        <CardContent className="pt-0">
          {metadata && (
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(metadata).map(([key, value]) => (
                <span key={key} className="text-xs text-muted-foreground">
                  {key}: <span className="text-foreground">{value}</span>
                </span>
              ))}
            </div>
          )}
          {url && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onAction({ type: 'open_url', url })}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
          )}
          {children}
        </CardContent>
      )}
    </ShadcnCard>
  );
}

function StackComponent({
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  children
}: {
  direction?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  children?: React.ReactNode;
}) {
  const spacingClasses: Record<string, string> = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div className={cn(
      'flex',
      direction === 'horizontal' ? 'flex-row' : 'flex-col',
      spacingClasses[spacing],
      alignClasses[align],
      justifyClasses[justify]
    )}>
      {children}
    </div>
  );
}

function GridComponent({
  columns = 2,
  gap = 'md',
  children
}: {
  columns?: number;
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children?: React.ReactNode;
}) {
  const gapClasses: Record<string, string> = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const colClasses: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  return (
    <div className={cn('grid', colClasses[columns] || 'grid-cols-2', gapClasses[gap])}>
      {children}
    </div>
  );
}

function ListComponent({ items, emptyMessage = 'No items' }: {
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    source?: string;
    sourceId?: string;
    url?: string;
    metadata?: Record<string, string>;
  }>;
  emptyMessage?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
        >
          {item.source && (
            <div className="text-muted-foreground">
              {sourceIcons[item.source]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{item.title}</div>
            {item.subtitle && (
              <div className="text-sm text-muted-foreground truncate">
                {item.subtitle}
              </div>
            )}
          </div>
          {item.url && (
            <Button variant="ghost" size="sm" asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function TableComponent({ columns, rows }: {
  columns: Array<{ key: string; label: string; width?: string }>;
  rows: Array<Record<string, string | number | boolean>>;
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2 text-left font-medium"
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2">
                  {String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TimelineComponent({ items, title }: {
  items: Array<{
    id: string;
    time: string;
    title: string;
    description?: string;
    icon?: string;
    status?: 'past' | 'current' | 'upcoming';
  }>;
  title?: string;
}) {
  return (
    <div className="space-y-4">
      {title && <h3 className="font-semibold">{title}</h3>}
      <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
        {items.map((item) => (
          <div key={item.id} className="relative">
            <div className={cn(
              'absolute -left-4 w-4 h-4 rounded-full border-2',
              item.status === 'current' ? 'bg-primary border-primary' :
              item.status === 'past' ? 'bg-muted border-muted-foreground' :
              'bg-background border-border'
            )} />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  {item.time}
                </span>
                <span className="font-medium">{item.title}</span>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground">{item.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionCardComponent({
  suggestion,
  onAction,
  onDismiss
}: {
  suggestion: Suggestion;
  onAction: ActionHandler;
  onDismiss?: (id: string) => void;
}) {
  return (
    <div className={cn(
      'relative rounded-lg border p-4 space-y-3 transition-all hover:shadow-md',
      urgencyColors[suggestion.urgency]
    )}>
      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 pr-6">
        <div className="text-muted-foreground">
          {sourceIcons[suggestion.source]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{suggestion.title}</div>
          {suggestion.subtitle && (
            <div className="text-sm text-muted-foreground truncate">
              {suggestion.subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Reason - the "why" */}
      <div className="text-sm text-muted-foreground bg-background/50 rounded px-2 py-1">
        {suggestion.reason}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {suggestion.actions.map((action, i) => (
          <Button
            key={i}
            variant={action.variant === 'primary' ? 'default' : action.variant || 'secondary'}
            size="sm"
            onClick={() => onAction(action.action)}
            className="gap-1"
          >
            {action.icon === 'external' && <ExternalLink className="h-3 w-3" />}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function GeneratedViewComponent({
  children
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  // Title/description are handled by the outer GeneratedView wrapper
  // This just renders children
  return (
    <div className="space-y-4">
      {children}
    </div>
  );
}

// === Component Registry ===
export const componentRegistry: Record<string, React.ComponentType<any>> = {
  Text: TextComponent,
  Badge: BadgeComponent,
  Metric: MetricComponent,
  ActionButton: ActionButtonComponent,
  Alert: AlertComponent,
  Card: CardComponent,
  Stack: StackComponent,
  Grid: GridComponent,
  List: ListComponent,
  Table: TableComponent,
  Timeline: TimelineComponent,
  SuggestionCard: SuggestionCardComponent,
  GeneratedView: GeneratedViewComponent,
};

// === Recursive Renderer ===
export function renderUITree(
  node: UINode,
  context: RenderContext,
  key?: string | number
): React.ReactNode {
  const Component = componentRegistry[node.type];

  if (!Component) {
    console.warn(`Unknown component type: ${node.type}`);
    return null;
  }

  // Build props with action handler
  const props = {
    ...node.props,
    onAction: context.onAction,
    key,
  };

  // Render children recursively
  const children = node.children?.map((child, i) =>
    renderUITree(child, context, i)
  );

  return <Component {...props}>{children}</Component>;
}
