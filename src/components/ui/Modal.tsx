import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from './cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  hideCloseButton?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  hideCloseButton = false,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'transition-all duration-200'
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed z-50 flex flex-col',
            // Mobile: slide up bottom sheet with safe padding and rounded top
            'bottom-0 left-0 right-0 max-h-[92dvh] rounded-t-3xl pb-safe',
            // Desktop: centered modal
            'md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
            'md:w-full md:max-w-lg md:rounded-3xl md:max-h-[85dvh]',
            'bg-surface border border-border/80 shadow-2xl shadow-black/20',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            'md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:slide-in-from-bottom-0',
            'md:data-[state=closed]:zoom-out-95 md:data-[state=open]:zoom-in-95',
            'duration-200 ease-out focus:outline-none',
            className
          )}
        >
          {/* Handle bar on mobile */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 shrink-0">
            <Dialog.Title className="text-lg font-bold font-heading text-foreground">
              {title}
            </Dialog.Title>
            {!hideCloseButton && (
              <Dialog.Close asChild>
                <button
                  className="rounded-full p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
