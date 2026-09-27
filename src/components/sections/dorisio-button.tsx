/**
 * Dorisio Button Component
 * Opens tip modal dialog with preset tiers, custom amounts, and wallet selection
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { useCreateTip } from '@/hooks/use-create-tip';
import { useWallet } from '@/hooks/use-wallet';
import { useNotification } from '@/components/notification-provider';
import { dedupedRequest } from '@/lib/request-deduplicator';
import { WalletSelector } from '@/components/sections/wallet-selector';
import { useTipTiers } from '@/hooks/use-tip-tiers';
import {
  appendEmoji,
  normalizeTipMessage,
  TIP_MESSAGE_MAX_LENGTH,
  validateTipMessage,
} from '@/lib/tip-message';

interface DorisioButtonProps {
  creatorId: string;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tipTiers?: number[];
}

const QUICK_EMOJIS = ['👏', '🔥', '💛', '🙌', '✨', '🚀'];

export default function DorisioButton({
  creatorId,
  variant = 'default',
  size = 'md',
  className = '',
  tipTiers: propTipTiers,
}: DorisioButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customAmountInput, setCustomAmountInput] = useState('');
  const [customAmountError, setCustomAmountError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);

  const { createTip, loading } = useCreateTip();
  const { success, error: notifyError } = useNotification();
  const { wallets, getPreferredWalletId, setLastUsedWallet } = useWallet();
  const {
    tiers: activeTiers,
    recentCustomAmounts,
    addRecentCustomAmount,
  } = useTipTiers(creatorId, propTipTiers);

  // Auto-select preferred wallet when modal opens
  useEffect(() => {
    if (isOpen && !selectedWalletId) {
      const preferredId = getPreferredWalletId(creatorId);
      if (preferredId && wallets.some((w) => w.id === preferredId)) {
        setSelectedWalletId(preferredId);
      } else if (wallets.length > 0) {
        setSelectedWalletId(wallets[0].id);
      }
    }
  }, [isOpen, selectedWalletId, creatorId, wallets, getPreferredWalletId]);

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-primary text-primary hover:bg-primary/5',
  };

  const normalizedMessage = normalizeTipMessage(message);
  const shareText = selectedAmount
    ? `I just supported a creator with a ${selectedAmount} tip on Dorisio${
        normalizedMessage ? `: ${normalizedMessage}` : ''
      }`
    : 'I am supporting creators on Dorisio';
  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
  const socialShareLinks = [
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    },
    {
      label: 'Share on LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    },
  ];

  function handleClose(open: boolean): void {
    setIsOpen(open);
    if (!open) {
      setSelectedAmount(null);
      setSelectedWalletId(null);
      setIsCustom(false);
      setCustomAmountInput('');
      setCustomAmountError(null);
      setMessage('');
      setMessageError(null);
    }
  }

  function handleSelectPreset(amount: number): void {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmountInput('');
    setCustomAmountError(null);
  }

  function handleCustomAmountChange(value: string): void {
    setCustomAmountInput(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setSelectedAmount(null);
      setCustomAmountError(null);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (isNaN(parsed) || parsed <= 0) {
      setSelectedAmount(null);
      setCustomAmountError('Please enter an amount greater than $0');
    } else {
      setSelectedAmount(parsed);
      setCustomAmountError(null);
    }
  }

  function handleSelectRecent(amount: number): void {
    setIsCustom(true);
    setCustomAmountInput(amount.toString());
    setSelectedAmount(amount);
    setCustomAmountError(null);
  }

  async function handleSendTip(): Promise<void> {
    if (!selectedAmount || !selectedWalletId || loading || Boolean(customAmountError)) return;

    const normalizedMsg = normalizeTipMessage(message);
    const validationError = validateTipMessage(normalizedMsg);
    if (validationError) {
      setMessageError(validationError);
      return;
    }

    const dedupeKey = `create-tip:${creatorId}:${selectedAmount}:${selectedWalletId}:${normalizedMsg}`;

    try {
      await dedupedRequest(
        () =>
          createTip({
            creatorId,
            amount: selectedAmount,
            message: normalizedMsg || undefined,
          }),
        dedupeKey
      );
      if (isCustom && selectedAmount > 0) {
        addRecentCustomAmount(selectedAmount);
      }
      setLastUsedWallet(creatorId, selectedWalletId);
      success(`Tip of $${selectedAmount} sent!`, 'Thank you');
      handleClose(false);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send tip';
      notifyError(errMsg, 'Tip failed');
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`rounded font-semibold transition ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      >
        💰 Send a Tip
      </button>

      <Modal open={isOpen} onOpenChange={handleClose}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Send a Tip</ModalTitle>
            <ModalDescription>Support this creator with an instant USDC payment</ModalDescription>
          </ModalHeader>
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">Creator ID: {creatorId}</p>

            {/* Wallet Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select wallet:</label>
              <WalletSelector
                value={selectedWalletId}
                onChange={setSelectedWalletId}
                disabled={loading}
              />
            </div>

            {/* Amount Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Select amount:</label>

              {/* Preset buttons + Custom toggle in responsive mobile-friendly grid */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
                aria-label="Preset tip amounts"
              >
                {activeTiers.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleSelectPreset(amount)}
                    disabled={loading}
                    aria-pressed={!isCustom && selectedAmount === amount}
                    className={`py-2 px-3 border rounded font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      !isCustom && selectedAmount === amount
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setIsCustom(true);
                    if (
                      customAmountInput &&
                      !isNaN(Number(customAmountInput)) &&
                      Number(customAmountInput) > 0
                    ) {
                      setSelectedAmount(Number(customAmountInput));
                    } else {
                      setSelectedAmount(null);
                    }
                  }}
                  disabled={loading}
                  aria-pressed={isCustom}
                  className={`py-2 px-3 border rounded font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCustom
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Custom amount input field */}
              {isCustom && (
                <div className="space-y-1.5 pt-1">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      placeholder="Enter custom amount"
                      value={customAmountInput}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      disabled={loading}
                      aria-label="Custom tip amount"
                      className="w-full pl-7 pr-3 py-2 border rounded-md text-sm bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  {customAmountError && (
                    <p role="alert" className="text-xs text-destructive">
                      {customAmountError}
                    </p>
                  )}
                </div>
              )}

              {/* Recent custom amounts for quick access (up to 3) */}
              {recentCustomAmounts.length > 0 && (
                <div className="space-y-1.5 pt-1" aria-label="Recent custom tips">
                  <span className="text-xs text-muted-foreground">Recent custom amounts:</span>
                  <div className="flex flex-wrap gap-2">
                    {recentCustomAmounts.map((recent) => (
                      <button
                        key={`recent-${recent}`}
                        type="button"
                        onClick={() => handleSelectRecent(recent)}
                        disabled={loading}
                        className={`px-2.5 py-1 text-xs border rounded-full transition hover:bg-muted ${
                          isCustom && selectedAmount === recent
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground'
                        }`}
                        aria-label={`Recent tip $${recent}`}
                      >
                        ${recent}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Message input */}
            <div className="space-y-3 mt-5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="tip-message" className="text-sm font-medium">
                  Message <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <span className="text-xs text-muted-foreground">
                  {message.length}/{TIP_MESSAGE_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="tip-message"
                value={message}
                maxLength={TIP_MESSAGE_MAX_LENGTH}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setMessageError(validateTipMessage(event.target.value));
                }}
                placeholder="Add a note to brighten their day"
                className="min-h-24 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={loading}
              />
              <div className="flex flex-wrap gap-2" aria-label="Quick emoji picker">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      const nextMessage = appendEmoji(message, emoji);
                      setMessage(nextMessage);
                      setMessageError(validateTipMessage(nextMessage));
                    }}
                    disabled={loading || message.length >= TIP_MESSAGE_MAX_LENGTH}
                    className="h-9 w-9 rounded-md border text-lg hover:bg-muted disabled:opacity-50"
                    aria-label={`Add ${emoji} emoji`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {messageError && <p className="text-xs text-red-600">{messageError}</p>}
            </div>

            {/* Share link */}
            <div className="mt-5 rounded-md border p-3">
              <p className="text-sm font-medium">Share your support</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {socialShareLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <ModalFooter>
            <button
              onClick={() => handleClose(false)}
              disabled={loading}
              className="px-4 py-2 text-sm border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSendTip}
              disabled={
                !selectedAmount ||
                !selectedWalletId ||
                loading ||
                Boolean(messageError) ||
                Boolean(customAmountError)
              }
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Continue'}
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
