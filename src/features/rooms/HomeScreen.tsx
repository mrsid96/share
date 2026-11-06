import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Globe,
  Loader2,
  AlertCircle,
  Wifi,
  Lock,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useRoom } from '../../hooks/useRoom';

export default function HomeScreen() {
  const navigate = useNavigate();
  const { deviceName, error: authError } = useAuth();
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

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    const trimmed = joinInput.trim();
    if (!trimmed) {
      setInputError('Please enter a room code or invite link');
      return;
    }

    // Extract roomId if full URL provided
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

  const displayError = roomError || authError;

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center gap-12 py-4 sm:py-10">
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center gap-5 max-w-2xl px-2">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Browser-to-Browser File Transfer</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
            Share files directly. <br />
            <span className="bg-gradient-to-r from-blue-600 via-primary to-indigo-600 bg-clip-text text-transparent">
              Zero cloud uploads.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
            AirDrop across any browser. Send photos, 4K videos, archives, and documents
            directly between iPhone, Android, Mac, and Windows with WebRTC encryption.
          </p>

          {/* User's transient identity pill */}
          {deviceName && (
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-surface-elevated border border-border/80 shadow-xs text-xs sm:text-sm">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-foreground">Your device identity:</span>
              <span className="font-bold text-foreground">{deviceName}</span>
            </div>
          )}
        </div>

        {/* Action Cards Grid */}
        <div className="w-full max-w-md flex flex-col gap-5">
          {/* Primary Create Room Card */}
          <Card className="p-6 sm:p-7 flex flex-col gap-5 shadow-xl shadow-primary/5 border border-border/80 relative overflow-hidden">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-bold text-foreground">Create Sharing Room</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate an ephemeral sharing room. Nearby devices can join via instant QR code or link.
              </p>
            </div>

            <Button
              variant="default"
              size="lg"
              className="w-full text-base font-bold py-6 shadow-lg shadow-primary/25"
              onClick={handleStartSharing}
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Room&hellip;
                </>
              ) : (
                <>
                  Start sharing
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {displayError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="flex-1">{displayError}</p>
              </div>
            )}
          </Card>

          {/* Secondary Join Room Card */}
          <Card className="p-6 flex flex-col gap-4 shadow-sm border border-border/80">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-foreground">Join with Code or Link</h2>
              <p className="text-xs text-muted-foreground">
                Enter an invite URL or room identifier from another device.
              </p>
            </div>

            <form onSubmit={handleJoinSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Paste room link or code"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
              {inputError && (
                <p className="text-xs text-error font-medium">{inputError}</p>
              )}
              <Button
                type="submit"
                variant="outline"
                size="md"
                className="w-full font-semibold"
                disabled={!joinInput.trim() || isJoining}
              >
                Join Room
              </Button>
            </form>
          </Card>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full pt-4">
          <Card className="p-5 flex flex-col items-center text-center gap-3 border border-border/70 hover:border-primary/40 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">DTLS Encrypted</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Files stream directly through peer-to-peer WebRTC DataChannels. No servers ever store or see your data.
            </p>
          </Card>

          <Card className="p-5 flex flex-col items-center text-center gap-3 border border-border/70 hover:border-primary/40 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wifi className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">High Speed P2P</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transfers take full advantage of local Wi-Fi speeds without cloud upload throttling or bottlenecks.
            </p>
          </Card>

          <Card className="p-5 flex flex-col items-center text-center gap-3 border border-border/70 hover:border-primary/40 transition-colors">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Zero Installation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Works directly in Safari, Chrome, Edge, and Firefox. No native apps, no browser extensions, no signups.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
