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
    outgoingProgress,
    incomingProgress,
    outgoingStatus,
    completedFiles,
    role,
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

  // Handle selected recipient leaving
  React.useEffect(() => {
    if (selectedRecipientUid && !peers.some((p) => p.uid === selectedRecipientUid)) {
      setSelectedRecipientUid(null);
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
          <Loader2 className="h-9 w-9 animate-spin text-primary" />
          <p className="text-sm font-semibold text-foreground">Joining room&hellip;</p>
        </div>
      </AppShell>
    );
  }

  if (roomError) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4 max-w-md mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-error/10 text-error">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold text-foreground">Room Error</h2>
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
      <div className="flex flex-col gap-6 max-w-5xl mx-auto">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>{peers.length + 1} Device{peers.length !== 0 ? 's' : ''} in Room</span>
            </div>
            <span className="text-xs text-muted-foreground hidden md:inline">
              Room ID: <span className="font-mono text-foreground font-semibold">{roomId}</span>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-initial"
            >
              {copiedLink ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQrModal(true)}
              className="flex-1 sm:flex-initial"
              aria-label="Show QR Code"
            >
              <QrCode className="mr-1.5 h-4 w-4" />
              QR Code
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              className="text-muted-foreground hover:text-error hover:bg-error/10"
              aria-label="Leave room"
              title="Leave Room"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* QR Code Modal */}
        <Modal
          open={showQrModal}
          onClose={() => setShowQrModal(false)}
          title="Scan QR to Join Room"
        >
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="p-5 bg-white rounded-3xl shadow-md border border-border/60">
              <QRCodeSVG
                value={inviteUrl}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="flex flex-col items-center text-center gap-1 max-w-xs">
              <p className="text-sm font-bold text-foreground">
                Point any phone camera to join
              </p>
              <p className="text-xs text-muted-foreground">
                No app installation required. Works on iOS Safari, Android Chrome, and all desktop browsers.
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={handleCopyLink}
            >
              {copiedLink ? 'Copied to clipboard!' : 'Copy invite link'}
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
            title={role === 'sender' ? 'Sending Transfer' : 'Receiving Transfer'}
          >
            {isConnecting ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="text-base font-bold text-foreground">
                    Securing WebRTC DataChannel&hellip;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Establishing direct peer-to-peer connection with DTLS encryption.
                  </p>
                </div>
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
            className="flex items-center gap-3 p-4 rounded-2xl border border-error/30 bg-error/10 text-error text-sm font-semibold"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="flex-1">{transferError}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetTransfer}
              className="text-error hover:bg-error/20"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Main Grid: Devices & File Staging */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Device Discovery Radar (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-foreground">
                Nearby Devices
              </h2>
              {peers.length > 0 && (
                <span className="text-xs text-primary font-semibold">
                  Tap device to select
                </span>
              )}
            </div>

            <Card className="p-5 border border-border/80">
              <DeviceList
                devices={[
                  ...(currentDevice ? [currentDevice] : []),
                  ...peers,
                ]}
                currentDeviceUid={currentDevice?.uid}
                selectedUid={selectedRecipientUid}
                onSelect={(uid) =>
                  setSelectedRecipientUid(uid === selectedRecipientUid ? null : uid)
                }
              />
            </Card>
          </div>

          {/* Right: File Staging & Transfer (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-bold text-foreground">
                Send Files
              </h2>
              {recipientDevice && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>To: {recipientDevice.deviceName}</span>
                </div>
              )}
            </div>

            <Card className="p-5 flex flex-col gap-4 border border-border/80">
              {peers.length === 0 ? (
                <div className="text-center py-10 px-4 text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <p className="font-semibold text-foreground text-sm">
                    No recipients connected yet
                  </p>
                  <p className="max-w-xs leading-relaxed">
                    Share this room link or QR code with another phone or laptop to send files.
                  </p>
                </div>
              ) : !selectedRecipientUid ? (
                <div className="text-center py-10 px-4 text-muted-foreground text-xs flex flex-col items-center gap-2">
                  <p className="font-semibold text-foreground text-sm">
                    Select a recipient
                  </p>
                  <p className="max-w-xs leading-relaxed">
                    Tap any device card in the Nearby Devices list to start staging files.
                  </p>
                </div>
              ) : (
                <>
                  <FileDropZone
                    selectedFiles={selectedFiles}
                    onFilesSelected={handleAddFiles}
                    onRemoveFile={handleRemoveFile}
                  />

                  <Button
                    variant="default"
                    size="lg"
                    className="w-full font-bold shadow-lg shadow-primary/25 py-6 mt-2 text-base"
                    disabled={
                      selectedFiles.length === 0 ||
                      isConnecting ||
                      outgoingStatus === 'transferring'
                    }
                    onClick={handleSendFiles}
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
                      </>
                    )}
                  </Button>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
