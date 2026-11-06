import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-bold transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
    'rounded-2xl text-sm active:scale-[0.96] touch-manipulation',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-primary text-white shadow-md shadow-primary/30',
          'hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/35',
          'border border-primary/20',
        ],
        accent: [
          'bg-accent text-white shadow-md shadow-accent/30',
          'hover:bg-accent/90 hover:shadow-lg hover:shadow-accent/40',
          'border border-accent/20',
        ],
        secondary: [
          'bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
          'border border-border/80',
        ],
        ghost: [
          'bg-transparent text-foreground',
          'hover:bg-muted active:bg-muted/80',
        ],
        outline: [
          'border border-border/90 bg-surface text-foreground shadow-xs',
          'hover:bg-muted/70 hover:border-border',
        ],
        destructive: [
          'bg-error text-white shadow-md shadow-error/20',
          'hover:bg-error/90',
        ],
      },
      size: {
        sm: 'h-10 px-3.5 text-xs rounded-xl min-w-[44px]',
        md: 'h-12 px-5 text-sm rounded-2xl min-w-[48px]',
        lg: 'h-14 px-7 text-base font-extrabold rounded-2xl min-w-[52px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4 shrink-0 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
