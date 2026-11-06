import { create } from 'zustand';
import type { TransferProgress, TransferRequest, ReceivedFile } from '../types/transfer';

interface TransferState {
  // Outgoing
  selectedFiles: File[];
  selectedRecipientUid: string | null;
  outgoingTransfer: TransferRequest | null;
  outgoingProgress: TransferProgress | null;

  // Incoming
  incomingRequest: TransferRequest | null;
  incomingProgress: TransferProgress | null;
  receivedFiles: ReceivedFile[];

  // Actions
  setSelectedFiles: (files: File[]) => void;
  setSelectedRecipientUid: (uid: string | null) => void;
  setOutgoingTransfer: (transfer: TransferRequest | null) => void;
  setOutgoingProgress: (progress: TransferProgress | null) => void;
  setIncomingRequest: (request: TransferRequest | null) => void;
  setIncomingProgress: (progress: TransferProgress | null) => void;
  addReceivedFiles: (files: ReceivedFile[]) => void;
  reset: () => void;
}

export const useTransferStore = create<TransferState>((set) => ({
  selectedFiles: [],
  selectedRecipientUid: null,
  outgoingTransfer: null,
  outgoingProgress: null,
  incomingRequest: null,
  incomingProgress: null,
  receivedFiles: [],
  setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
  setSelectedRecipientUid: (selectedRecipientUid) => set({ selectedRecipientUid }),
  setOutgoingTransfer: (outgoingTransfer) => set({ outgoingTransfer }),
  setOutgoingProgress: (outgoingProgress) => set({ outgoingProgress }),
  setIncomingRequest: (incomingRequest) => set({ incomingRequest }),
  setIncomingProgress: (incomingProgress) => set({ incomingProgress }),
  addReceivedFiles: (files) =>
    set((state) => ({ receivedFiles: [...state.receivedFiles, ...files] })),
  reset: () =>
    set({
      selectedFiles: [],
      selectedRecipientUid: null,
      outgoingTransfer: null,
      outgoingProgress: null,
      incomingRequest: null,
      incomingProgress: null,
      receivedFiles: [],
    }),
}));
