import * as React from 'react';
import { cn } from './cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevated = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-3xl border border-border/80 bg-surface text-foreground transition-all duration-200',
          elevated
            ? 'shadow-xl shadow-primary/5 dark:shadow-black/40 border-border/90'
            : 'shadow-sm shadow-black/[0.03]',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
