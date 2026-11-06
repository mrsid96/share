import * as React from 'react';

function applyTheme() {
  const stored = (() => { try { return localStorage.getItem('theme'); } catch { return null; } })();
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = stored === 'dark' || (!stored && prefersDark);

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    // Apply on mount
    applyTheme();

    // Listen for system theme changes
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      // Only follow system preference if no stored preference
      try {
        if (!localStorage.getItem('theme')) {
          applyTheme();
        }
      } catch {
        applyTheme();
      }
    };

    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return <>{children}</>;
}
