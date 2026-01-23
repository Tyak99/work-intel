import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono tracking-wide uppercase',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/20 text-primary-glow border-primary/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
        secondary:
          'border-transparent bg-secondary/20 text-indigo-300 border-secondary/50',
        destructive:
          'border-transparent bg-destructive/20 text-red-400 border-destructive/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
        outline: 'text-foreground border-white/20 bg-white/5',
        neon: 'border-transparent bg-cyan-950 text-cyan-400 border border-cyan-500/30 shadow-glow-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
