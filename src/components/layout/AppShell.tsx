import * as React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Sun, Moon, ShieldCheck, Check, Edit2 } from 'lucide-react';
import { cn } from '../ui/cn';
import { useAuthStore } from '../../store/auth.store';

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
  const { deviceName, setDeviceName } = useAuthStore();
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState('');

  const handleStartEdit = () => {
    setTempName(deviceName);
    setIsEditingName(true);
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== deviceName) {
      setDeviceName(trimmed);
      try {
        sessionStorage.setItem('sharewave_device_name', trimmed);
      } catch {
        // ignore
      }
    }
    setIsEditingName(false);
  };

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary relative overflow-x-hidden">
      {/* Warm ambient radiant gradient top illumination */}
      <div
        className="pointer-events-none fixed inset-x-0 -top-24 h-96 opacity-45 dark:opacity-25 blur-3xl -z-10 animate-warm-glow"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.2) 50%, transparent 80%)',
        }}
        aria-hidden="true"
      />

      {/* Floating glass header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/85 backdrop-blur-xl transition-colors">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo & Brand */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
            aria-label="ShareWave Home"
          >
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg shadow-primary/25 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 overflow-hidden"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Zap className="h-5 w-5 text-white fill-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold font-heading tracking-tight text-foreground flex items-center gap-1.5 leading-none">
                ShareWave
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                  Instant
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
                Zero Cloud • Direct P2P
              </span>
            </div>
          </Link>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Device Identity Chip */}
            {deviceName && (
              <div className="relative">
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-1">
                    <input
                      type="text"
                      autoFocus
                      maxLength={24}
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={() => handleSaveName()}
                      className="px-2.5 py-1 text-xs rounded-xl border border-primary bg-surface font-semibold text-foreground focus:outline-none w-28 sm:w-36"
                    />
                    <button
                      type="submit"
                      className="p-1 rounded-lg bg-primary text-white cursor-pointer hover:bg-primary/90"
                      aria-label="Save device name"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={handleStartEdit}
                    title="Click to rename your device"
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-surface-elevated border border-border/80 text-foreground hover:border-primary/40 transition-all cursor-pointer group active:scale-95"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="max-w-[100px] sm:max-w-[140px] truncate">{deviceName}</span>
                    <Edit2 className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100" />
                  </button>
                )}
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggle}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-2xl border border-border/80 bg-surface-elevated',
                'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                'transition-all duration-150 active:scale-95 cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            >
              {isDark ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-5 md:py-8">
        {children}
      </main>

      {/* Welcoming Minimal Footer */}
      <footer className="border-t border-border/50 py-5 text-center text-xs text-muted-foreground pb-safe">
        <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Direct WebRTC encryption. Files never touch any server or cloud.</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>P2P Mesh Ready</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
