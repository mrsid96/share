import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  QrCode,
  LogOut,
  Send,
  AlertCircle,
  Loader2,
  Users,
  Smartphone,
  Share2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { DeviceList } from '../../components/devices/DeviceList';
import { FileDropZone } from '../../components/files/FileDropZone';
import { IncomingTransferSheet } from '../../components/transfers/IncomingTransferSheet';
import { TransferProgress } from '../../components/transfers/TransferProgress';
import { CompletedTransfer } from '../../components/transfers/CompletedTransfer';
import { useAuth } from '../../hooks/useAuth';
import { useRoom } from '../../hooks/useRoom';
import { useTransfer } from '../../hooks/useTransfer';
import { formatBytes } from '../../utils/format-bytes';

export default function RoomScreen() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    room,
    peers,
    currentDevice,
    isJoining,
    error: roomError,
    joinRoom,
    leaveRoom,
  } = useRoom();

  const [selectedRecipientUid, setSelectedRecipientUid] = React.useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [showQrModal, setShowQrModal] = React.useState(false);

  // Initialize transfer manager
  const {
    initiateTransfer,
    acceptIncoming,
    declineIncoming,
    cancelTransfer,
    cancelConnecting,
    outgoingProgress,
    incomingProgress,
    outgoingStatus,
    completedFiles,
    role,
    connectionPhase,
    hasIncoming,
    incomingInitiatorUid,
    incomingFiles,
    error: transferError,
    isConnecting,
    isCompleted,
    resetTransfer,
  } = useTransfer(roomId || '');

  // Join room on mount if not already joined or if direct URL opened
  React.useEffect(() => {
    if (isAuthenticated && roomId && (!room || room.roomId !== roomId)) {
      joinRoom(roomId);
    }
  }, [isAuthenticated, roomId, room, joinRoom]);

  // Frictionless UX: Auto-select single peer if available and none currently selected
  React.useEffect(() => {
    if (peers.length === 1 && !selectedRecipientUid) {
      setSelectedRecipientUid(peers[0].uid);
    } else if (selectedRecipientUid && !peers.some((p) => p.uid === selectedRecipientUid)) {
      setSelectedRecipientUid(peers.length > 0 ? peers[0].uid : null);
    }
  }, [peers, selectedRecipientUid]);

  const inviteUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/room/${roomId}`;
  }, [roomId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Share room',
          text: `Beam files directly to me on Share: Room ${roomId}`,
          url: inviteUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fallback to modal
      }
    }
    setShowQrModal(true);
  };

  const handleLeave = async () => {
    await leaveRoom();
    navigate('/');
  };

  const handleSendFiles = async () => {
    if (!selectedRecipientUid || selectedFiles.length === 0) return;
    await initiateTransfer(selectedFiles, selectedRecipientUid);
  };

  const handleAddFiles = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetForAnother = () => {
    resetTransfer();
    setSelectedFiles([]);
  };

  const totalSelectedSize = React.useMemo(() => {
    return selectedFiles.reduce((sum, f) => sum + f.size, 0);
  }, [selectedFiles]);

  // Find recipient device name
  const recipientDevice = peers.find((p) => p.uid === selectedRecipientUid);

  // Find incoming sender device name
  const senderDevice = peers.find((p) => p.uid === incomingInitiatorUid);
  const senderName = senderDevice ? senderDevice.deviceName : 'Nearby Device';

  if (authLoading || (isJoining && !room)) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative flex items-center justify-center">
            <span className="absolute h-16 w-16 rounded-full bg-primary/20 animate-ping" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-base font-bold font-heading text-foreground">
            Entering room&hellip;
          </p>
        </div>
      </AppShell>
    );
  }

  if (roomError) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4 max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-error/10 text-error shadow-sm">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold font-heading text-foreground">Room Error</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{roomError}</p>
          </div>
          <Button variant="default" size="md" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-5 sm:gap-6 max-w-5xl mx-auto pb-6 sm:pb-8">
        {/* Top Floating Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-3xl bg-surface border border-border/80 shadow-xs">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>{peers.length + 1} Device{peers.length !== 0 ? 's' : ''} in Room</span>
            </div>
            <button
              onClick={handleCopyLink}
              title="Click to copy room code"
              className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted/30 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <span>Room: <span className="font-mono text-primary uppercase">{roomId}</span></span>
              {copiedLink ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-1 sm:flex-initial font-bold"
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Invite
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrModal(true)}
              className="flex-1 sm:flex-initial font-bold"
              aria-label="Show QR Code"
            >
              <QrCode className="mr-1.5 h-4 w-4" />
              QR Code
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              className="text-muted-foreground hover:text-error hover:bg-error/10 font-bold"
              aria-label="Leave room"
              title="Leave Room"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* QR Code Quick Modal */}
        <Modal
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          title="Scan to Join Instantly"
        >
          <div className="flex flex-col items-center gap-5 py-2">
            <div className="p-5 bg-white rounded-3xl shadow-lg border border-border/60">
              <QRCodeSVG
                value={inviteUrl}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="flex flex-col items-center text-center gap-1 max-w-xs">
              <span className="text-xs font-extrabold uppercase tracking-wider text-accent flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Quick Camera Scan
              </span>
              <p className="text-base font-bold font-heading text-foreground">
                Point any phone camera to join
              </p>
              <p className="text-xs text-muted-foreground">
                Works instantly in Safari, Chrome, and Firefox without installing any apps.
              </p>
            </div>
            <Button
              variant="default"
              size="md"
              className="w-full font-bold shadow-md shadow-primary/20"
              onClick={handleCopyLink}
            >
              {copiedLink ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-emerald-300" />
                  Copied link to clipboard!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy Invite Link
                </>
              )}
            </Button>
          </div>
        </Modal>

        {/* Transfer Modals */}
        {/* 1. Incoming Transfer Request */}
        <IncomingTransferSheet
          open={hasIncoming}
          senderName={senderName}
          files={incomingFiles}
          onAccept={acceptIncoming}
          onDecline={declineIncoming}
        />

        {/* 2. Active Transfer (Progress) */}
        {(outgoingProgress || incomingProgress || isConnecting) && !isCompleted && (
          <Modal
            open={true}
            onClose={() => {}}
            hideCloseButton={true}
            title={role === 'sender' ? 'Sending Stream' : 'Receiving Stream'}
          >
            {isConnecting ? (
              <div className="flex flex-col items-center justify-center py-6 gap-5 text-center">
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-16 w-16 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 max-w-xs">
                  <p className="text-base font-bold font-heading text-foreground">
                    {connectionPhase === 'waiting-for-accept'
                      ? 'Waiting for Recipient to Accept…'
                      : 'Establishing Direct P2P Channel…'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {connectionPhase === 'waiting-for-accept'
                      ? `Prompt sent to ${recipientDevice?.deviceName || 'device'}. They need to tap "Accept & Receive" on their screen.`
                      : 'Pairing browsers directly using encrypted WebRTC DataChannel.'}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelConnecting}
                  className="mt-2 text-muted-foreground hover:text-foreground font-semibold"
                >
                  Cancel Request
                </Button>
              </div>
            ) : (
              (outgoingProgress || incomingProgress) && (
                <TransferProgress
                  progress={(role === 'sender' ? outgoingProgress : incomingProgress)!}
                  role={role || 'sender'}
                  onCancel={cancelTransfer}
                />
              )
            )}
          </Modal>
        )}

        {/* 3. Completed Transfer */}
        {isCompleted && (
          <Modal open={true} onClose={handleResetForAnother} title="Transfer Complete">
            <CompletedTransfer
              role={role || 'sender'}
              files={completedFiles}
              onSendAnother={handleResetForAnother}
              onReturnToRoom={handleResetForAnother}
            />
          </Modal>
        )}

        {/* Transfer Error Alert */}
        {transferError && !isCompleted && (
          <div
            data-testid="transfer-error"
            className="flex items-center gap-3 p-4 rounded-3xl border border-error/30 bg-error/10 text-error text-sm font-semibold"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="flex-1">{transferError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTransfer}
              className="text-error hover:bg-error/20 font-bold"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Main Grid: Devices Radar (Left) & File Staging (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Left: Device Discovery Radar (7 cols on desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-heading text-foreground">
                  Nearby Devices
                </h2>
                {peers.length > 0 && (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    {peers.length} active
                  </span>
                )}
              </div>
              {peers.length > 0 && (
                <span className="text-xs text-primary font-bold">
                  Tap device to select
                </span>
              )}
            </div>

            <Card className="p-5 border border-border/80 bg-surface">
              <DeviceList
                devices={[
                  ...(currentDevice ? [currentDevice] : []),
                  ...peers,
                ]}
                currentDeviceUid={currentDevice?.uid}
                selectedUid={selectedRecipientUid}
                hasStagedFiles={selectedFiles.length > 0}
                onSelect={(uid) => {
                  setSelectedRecipientUid(uid === selectedRecipientUid ? null : uid);
                }}
                onShowQr={() => setShowQrModal(true)}
                onCopyLink={handleCopyLink}
                copiedLink={copiedLink}
              />
            </Card>
          </div>

          {/* Right: File Staging & Transfer (5 cols on desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold font-heading text-foreground">
                Drop & Send
              </h2>
              {recipientDevice && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[140px]">To: {recipientDevice.deviceName}</span>
                </div>
              )}
            </div>

            <Card className="p-5 flex flex-col gap-4 border border-border/80 bg-surface">
              <FileDropZone
                selectedFiles={selectedFiles}
                onFilesSelected={handleAddFiles}
                onRemoveFile={handleRemoveFile}
              />

              {/* Primary Send Button */}
              <Button
                variant="default"
                size="lg"
                className="w-full font-extrabold shadow-lg shadow-primary/25 py-6 mt-1 text-base transition-transform active:scale-95"
                disabled={
                  selectedFiles.length === 0 ||
                  !selectedRecipientUid ||
                  isConnecting ||
                  outgoingStatus === 'transferring'
                }
                onClick={handleSendFiles}
                aria-label="Send Files"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Send {selectedFiles.length > 0 ? `${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}` : 'Files'}
                    {totalSelectedSize > 0 && ` (${formatBytes(totalSelectedSize)})`}
                    {recipientDevice && (
                      <span className="truncate max-w-[140px] ml-1 opacity-90 font-bold">
                        to {recipientDevice.deviceName}
                      </span>
                    )}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
