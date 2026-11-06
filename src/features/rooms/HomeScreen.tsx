import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Zap,
  ShieldCheck,
  Smartphone,
  Image as ImageIcon,
  FileText,
  ClipboardPaste,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useRoom } from '../../hooks/useRoom';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { error: authError } = useAuth();
  const { room, createRoom, isJoining, error: roomError } = useRoom();

  const [joinInput, setJoinInput] = React.useState('');
  const [inputError, setInputError] = React.useState<string | null>(null);

  const handleStartSharing = async () => {
    try {
      await createRoom();
    } catch {
      // Handled in hook
    }
  };

  // When room is created in store, navigate
  React.useEffect(() => {
    if (room?.roomId) {
      navigate(`/room/${room.roomId}`);
    }
  }, [room?.roomId, navigate]);

  const handleJoinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInputError(null);
    const trimmed = joinInput.trim();
    if (!trimmed) {
      setInputError('Please enter a room code or invite link');
      return;
    }

    let roomId = trimmed;
    try {
      if (trimmed.includes('http://') || trimmed.includes('https://')) {
        const url = new URL(trimmed);
        const pathParts = url.pathname.split('/').filter(Boolean);
        const roomParam = url.searchParams.get('room');
        if (roomParam) {
          roomId = roomParam;
        } else if (pathParts.length > 0 && pathParts[pathParts.length - 2] === 'room') {
          roomId = pathParts[pathParts.length - 1];
        } else if (pathParts.length > 0) {
          roomId = pathParts[pathParts.length - 1];
        }
      }
    } catch {
      // Use as-is
    }

    if (!roomId) {
      setInputError('Could not recognize room code');
      return;
    }

    navigate(`/room/${roomId}`);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJoinInput(text.trim());
      }
    } catch {
      // Fallback
    }
  };

  const displayError = roomError || authError;

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-8 sm:gap-12 py-2 sm:py-8 max-w-3xl mx-auto">
        {/* Welcoming Hero Section */}
        <div className="flex flex-col items-center text-center gap-4 px-2 w-full">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Browser-to-Browser Instant AirDrop</span>
          </div>

          {/* Heading - Contains ShareWave for test compatibility */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black font-heading tracking-tight text-foreground leading-[1.15]">
            ShareWave <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-accent bg-clip-text text-transparent">
              Beam files nearby in seconds.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl font-medium">
            No apps. No passwords. Zero cloud uploads. Send full-res photos, 4K videos, and large archives directly between any phone and computer.
          </p>

          {/* Supported format pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface border border-border/80 text-xs font-semibold text-foreground/80 shadow-xs">
              <ImageIcon className="h-3.5 w-3.5 text-accent" /> Photos & Videos
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface border border-border/80 text-xs font-semibold text-foreground/80 shadow-xs">
              <FileText className="h-3.5 w-3.5 text-primary" /> Any Document
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface border border-border/80 text-xs font-semibold text-foreground/80 shadow-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> 100% Private
            </span>
          </div>
        </div>

        {/* Primary Action Card Hub - 1-Tap Experience */}
        <div className="w-full max-w-md flex flex-col gap-4">
          <Card className="p-6 sm:p-8 flex flex-col gap-6 shadow-xl shadow-primary/10 border border-border/90 relative overflow-hidden bg-surface">
            {/* Ambient subtle glow background */}
            <div
              className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-primary/10 blur-2xl pointer-events-none"
              aria-hidden="true"
            />

            {/* 1-Tap Create Action */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-extrabold text-accent uppercase tracking-wider">
                  Ready to send?
                </span>
                <h2 className="text-xl font-bold font-heading text-foreground">
                  Create Instant Room
                </h2>
                <p className="text-xs text-muted-foreground">
                  Generate a private room in 1 tap. Friends join instantly with a link or QR code.
                </p>
              </div>

              <Button
                variant="default"
                size="lg"
                className="w-full text-base font-extrabold py-6 shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                onClick={handleStartSharing}
                disabled={isJoining}
                aria-label="Start Sharing"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Opening Room&hellip;
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5 fill-white text-white" />
                    Start Sharing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>

            {displayError && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-error/10 border border-error/20 text-error text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="flex-1">{displayError}</p>
              </div>
            )}

            {/* Seamless Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="w-full border-t border-border/80" />
              <span className="absolute bg-surface px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                or join room
              </span>
            </div>

            {/* Quick Join Input Box */}
            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-2.5">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Paste room link or code"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 rounded-2xl border border-border bg-surface-elevated text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-semibold transition-all"
                />
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  title="Paste from clipboard"
                  className="absolute right-2 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  aria-label="Paste from clipboard"
                >
                  <ClipboardPaste className="h-4 w-4" />
                </button>
              </div>

              {inputError && (
                <p className="text-xs text-error font-medium px-1">{inputError}</p>
              )}

              <Button
                type="submit"
                variant="outline"
                size="md"
                className="w-full font-bold h-12"
                disabled={!joinInput.trim() || isJoining}
              >
                Join Room
              </Button>
            </form>
          </Card>
        </div>

        {/* 3-Step Friendly How-It-Works Visual Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-2">
          <Card className="p-5 flex flex-col items-center text-center gap-3 border border-border/80 bg-surface/70 hover:border-primary/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold font-heading text-foreground">1. Open & Connect</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Open ShareWave on any phone or laptop. Scan QR or share link to pair.
              </p>
            </div>
          </Card>

          <Card className="p-5 flex flex-col items-center text-center gap-3 border border-border/80 bg-surface/70 hover:border-primary/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent shadow-xs">
              <Smartphone className="h-6 w-6" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold font-heading text-foreground">2. Tap Any Device</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nearby devices show up instantly on your radar like Apple AirDrop.
              </p>
            </div>
          </Card>

          <Card className="p-5 flex flex-col items-center text-center gap-3 border border-border/80 bg-surface/70 hover:border-primary/40 transition-all">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold font-heading text-foreground">3. Beam Directly</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stream files peer-to-peer at full local Wi-Fi speeds with DTLS security.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
