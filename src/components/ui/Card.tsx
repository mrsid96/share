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
          'rounded-2xl border border-border/80 bg-surface text-foreground transition-all duration-150',
          elevated
            ? 'shadow-xl shadow-black/5 dark:shadow-black/30 border-border'
            : 'shadow-xs',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
