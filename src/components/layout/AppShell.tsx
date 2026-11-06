import * as React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Sun, Moon, Shield } from 'lucide-react';
import { cn } from '../ui/cn';

function useThemeToggle() {
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const toggle = React.useCallback(() => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
      try {
        localStorage.setItem('theme', 'light');
      } catch {
        // ignore
      }
    } else {
      root.classList.add('dark');
      setIsDark(true);
      try {
        localStorage.setItem('theme', 'dark');
      } catch {
        // ignore
      }
    }
  }, []);

  return { isDark, toggle };
}

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { isDark, toggle } = useThemeToggle();

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Ambient gradient top illumination */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-96 opacity-40 dark:opacity-20 blur-3xl -z-10"
        style={{
          background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.35), transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur-xl transition-colors">
        <div className="mx-auto max-w-[1000px] flex items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Logo & name */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            aria-label="ShareWave Home"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-md shadow-primary/20 transition-transform group-hover:scale-105 group-active:scale-95"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              <Zap className="h-5 w-5 text-white fill-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                ShareWave
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  P2P
                </span>
              </span>
            </div>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2.5 py-1 rounded-full bg-surface-elevated border border-border/80">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Direct WebRTC</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-surface-elevated',
                'text-muted-foreground hover:text-foreground hover:bg-muted',
                'transition-all duration-150 active:scale-95 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 mx-auto w-full max-w-[1000px] px-4 sm:px-6 py-6 md:py-10">
        {children}
      </main>

      {/* Minimal footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-[1000px] px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Share files directly between browsers with DTLS encryption. Zero server storage.</p>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Network Active</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
