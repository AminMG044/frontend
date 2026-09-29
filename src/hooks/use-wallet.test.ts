import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWallet as sdkUseWallet } from 'dorisio-sdk/react';
import type { Wallet } from 'dorisio-sdk';
import { mapWalletError, useWallet, type WalletInfo } from './use-wallet';
import { useWalletPreferenceStore } from '@/stores/wallet-preference-store';

const mockGenerateNonce = vi.fn();
const mockGetChallenge = vi.fn();
const mockVerifyWallet = vi.fn();
const mockListWallets = vi.fn();
const mockSelectWallet = vi.fn();
const mockUnlinkWallet = vi.fn();
const mockRenameWallet = vi.fn();
const mockGetBalance = vi.fn();
const mockReset = vi.fn();

vi.mock('dorisio-sdk/react', () => ({
  useWallet: vi.fn(),
}));

type SDKWalletResult = ReturnType<typeof sdkUseWallet>;

function buildSDKResult(overrides: Partial<SDKWalletResult> = {}): SDKWalletResult {
  const wallet = {
    id: '1',
    userId: 'user-1',
    publicKey: 'test-key-1',
    name: 'My Wallet',
    verified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  return {
    wallets: [wallet],
    selectedWallet: wallet,
    loading: false,
    error: undefined,
    challengeStep: 'idle',
    generateNonce: mockGenerateNonce,
    getChallenge: mockGetChallenge,
    verifyWallet: mockVerifyWallet,
    listWallets: mockListWallets,
    selectWallet: mockSelectWallet,
    unlinkWallet: mockUnlinkWallet,
    renameWallet: mockRenameWallet,
    getBalance: mockGetBalance,
    reset: mockReset,
    ...overrides,
  } as SDKWalletResult;
}

function makeSdkError(message: string, code?: string): Error {
  const error = new Error(message) as Error & { code?: string };
  if (code) error.code = code;
  return error;
}

describe('mapWalletError', () => {
  describe('non-Error values', () => {
    it('returns generic message for string input', () => {
      expect(mapWalletError('plain string error')).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });

    it('returns generic message for null input', () => {
      expect(mapWalletError(null)).toBe('An unexpected error occurred. Please try again.');
    });

    it('returns generic message for undefined input', () => {
      expect(mapWalletError(undefined)).toBe('An unexpected error occurred. Please try again.');
    });

    it('returns generic message for number input', () => {
      expect(mapWalletError(500)).toBe('An unexpected error occurred. Please try again.');
    });

    it('returns generic message for plain object input', () => {
      expect(mapWalletError({ error: 'something broke' })).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });

  describe('SDK error codes', () => {
    it('returns friendly message for WALLET_NOT_FOUND', () => {
      expect(mapWalletError(makeSdkError('not found', 'WALLET_NOT_FOUND'))).toBe(
        'Wallet not found. It may have already been removed.'
      );
    });

    it('returns friendly message for WALLET_ALREADY_LINKED', () => {
      expect(mapWalletError(makeSdkError('duplicate', 'WALLET_ALREADY_LINKED'))).toBe(
        'This wallet is already linked to your account.'
      );
    });

    it('returns friendly message for INVALID_SIGNATURE', () => {
      expect(mapWalletError(makeSdkError('bad signature', 'INVALID_SIGNATURE'))).toBe(
        'Wallet verification failed: the signature is invalid. Please try again.'
      );
    });

    it('returns friendly message for CHALLENGE_EXPIRED', () => {
      expect(mapWalletError(makeSdkError('expired challenge', 'CHALLENGE_EXPIRED'))).toBe(
        'Verification challenge expired. Please start the verification process again.'
      );
    });

    it('returns friendly message for UNAUTHORIZED', () => {
      expect(mapWalletError(makeSdkError('unauthorized', 'UNAUTHORIZED'))).toBe(
        'Your session has expired. Please log in again.'
      );
    });

    it('returns friendly message for 401 code', () => {
      expect(mapWalletError(makeSdkError('unauthorized', '401'))).toBe(
        'Your session has expired. Please log in again.'
      );
    });

    it('returns friendly message for FORBIDDEN', () => {
      expect(mapWalletError(makeSdkError('forbidden access', 'FORBIDDEN'))).toBe(
        'You do not have permission to perform this action.'
      );
    });

    it('returns friendly message for 403 code', () => {
      expect(mapWalletError(makeSdkError('forbidden access', '403'))).toBe(
        'You do not have permission to perform this action.'
      );
    });

    it('returns friendly message for RATE_LIMITED', () => {
      expect(mapWalletError(makeSdkError('slow down', 'RATE_LIMITED'))).toBe(
        'Too many requests. Please wait a moment and try again.'
      );
    });

    it('returns friendly message for 429 code', () => {
      expect(mapWalletError(makeSdkError('rate limited', '429'))).toBe(
        'Too many requests. Please wait a moment and try again.'
      );
    });

    it('returns friendly message for NETWORK_ERROR', () => {
      expect(mapWalletError(makeSdkError('failed to connect', 'NETWORK_ERROR'))).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('returns friendly message for ECONNRESET', () => {
      expect(mapWalletError(makeSdkError('connection reset', 'ECONNRESET'))).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('returns friendly message for ECONNREFUSED', () => {
      expect(mapWalletError(makeSdkError('connection refused', 'ECONNREFUSED'))).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('returns friendly message for TIMEOUT', () => {
      expect(mapWalletError(makeSdkError('timed out', 'TIMEOUT'))).toBe(
        'The request timed out. Please try again.'
      );
    });

    it('returns friendly message for REQUEST_TIMEOUT', () => {
      expect(mapWalletError(makeSdkError('request timed out', 'REQUEST_TIMEOUT'))).toBe(
        'The request timed out. Please try again.'
      );
    });

    it('returns friendly message for SERVICE_UNAVAILABLE', () => {
      expect(mapWalletError(makeSdkError('server down', 'SERVICE_UNAVAILABLE'))).toBe(
        'Service temporarily unavailable. Please try again shortly.'
      );
    });

    it('returns friendly message for 503 code', () => {
      expect(mapWalletError(makeSdkError('service down', '503'))).toBe(
        'Service temporarily unavailable. Please try again shortly.'
      );
    });

    it('returns friendly message for BLOCKCHAIN_TIMEOUT', () => {
      expect(mapWalletError(makeSdkError('ledger timeout', 'BLOCKCHAIN_TIMEOUT'))).toBe(
        'Blockchain confirmation timed out. The transaction may still complete — check back shortly.'
      );
    });
  });

  describe('message inspection fallbacks', () => {
    it('detects network errors from message text', () => {
      expect(mapWalletError(new Error('A network connection error occurred'))).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('detects timeout from message text', () => {
      expect(mapWalletError(new Error('Operation timeout after 5000ms'))).toBe(
        'The request timed out. Please try again.'
      );
    });

    it('detects unauthorized from message text', () => {
      expect(mapWalletError(new Error('User is unauthorized to perform action'))).toBe(
        'Your session has expired. Please log in again.'
      );
    });

    it('detects 401 status from message text', () => {
      expect(mapWalletError(new Error('Request failed with status code 401'))).toBe(
        'Your session has expired. Please log in again.'
      );
    });

    it('detects invalid wallet from message text', () => {
      expect(mapWalletError(new Error('The provided wallet address is invalid'))).toBe(
        'Invalid wallet address. Please ensure the wallet is correct.'
      );
    });

    it('detects signature verification failure from message text', () => {
      expect(mapWalletError(new Error('Cryptographic signature check failed'))).toBe(
        'Wallet verification failed: the signature is invalid. Please try again.'
      );
    });

    it('falls back to custom error message for unknown errors', () => {
      expect(mapWalletError(new Error('Custom application domain error'))).toBe(
        'Custom application domain error'
      );
    });

    it('falls back to default message if Error has empty message', () => {
      expect(mapWalletError(new Error(''))).toBe(
        'An unexpected error occurred. Please try again.'
      );
    });
  });
});

describe('useWallet Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useWalletPreferenceStore.setState({
      defaultWalletId: null,
      lastUsedWalletByCreator: {},
    });
    vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult());
  });

  describe('initialization and state mapping', () => {
    it('returns mapped wallet list with all properties', () => {
      const { result } = renderHook(() => useWallet());

      expect(result.current.wallets).toHaveLength(1);
      expect(result.current.wallets[0]).toEqual({
        id: '1',
        publicKey: 'test-key-1',
        name: 'My Wallet',
        verified: true,
      });
    });

    it('handles multiple wallets and maps verified default correctly', () => {
      vi.mocked(sdkUseWallet).mockReturnValue(
        buildSDKResult({
          wallets: [
            {
              id: 'w-1',
              userId: 'u-1',
              publicKey: 'key-1',
              name: 'First',
              verified: true,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            {
              id: 'w-2',
              userId: 'u-1',
              publicKey: 'key-2',
              name: null,
              verified: undefined,
              createdAt: '2026-01-02T00:00:00.000Z',
            },
          ],
        })
      );

      const { result } = renderHook(() => useWallet());

      expect(result.current.wallets).toHaveLength(2);
      expect(result.current.wallets[0].verified).toBe(true);
      expect(result.current.wallets[1].name).toBeUndefined();
      expect(result.current.wallets[1].verified).toBe(false);
    });

    it('returns selected wallet when SDK provides one', () => {
      const { result } = renderHook(() => useWallet());

      expect(result.current.selectedWallet).toEqual({
        id: '1',
        publicKey: 'test-key-1',
        name: 'My Wallet',
        verified: true,
      });
    });

    it('returns null when SDK selectedWallet is null', () => {
      vi.mocked(sdkUseWallet).mockReturnValue(
        buildSDKResult({
          selectedWallet: null as unknown as SDKWalletResult['selectedWallet'],
        })
      );

      const { result } = renderHook(() => useWallet());

      expect(result.current.selectedWallet).toBeNull();
    });

    it('handles selected wallet with undefined verified property', () => {
      vi.mocked(sdkUseWallet).mockReturnValue(
        buildSDKResult({
          selectedWallet: {
            id: '1',
            userId: 'user-1',
            publicKey: 'test-key-1',
            name: 'Unverified Wallet',
            verified: undefined,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        })
      );

      const { result } = renderHook(() => useWallet());

      expect(result.current.selectedWallet?.verified).toBe(false);
    });

    it('passes through loading state', () => {
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ loading: true }));

      const { result } = renderHook(() => useWallet());

      expect(result.current.loading).toBe(true);
    });

    it('passes through error state', () => {
      vi.mocked(sdkUseWallet).mockReturnValue(
        buildSDKResult({ error: 'Failed to fetch wallets' })
      );

      const { result } = renderHook(() => useWallet());

      expect(result.current.error).toBe('Failed to fetch wallets');
    });

    it('exposes all expected functions and action utilities', () => {
      const { result } = renderHook(() => useWallet());

      expect(typeof result.current.fetchWallets).toBe('function');
      expect(typeof result.current.generateNonce).toBe('function');
      expect(typeof result.current.getChallenge).toBe('function');
      expect(typeof result.current.verifyWallet).toBe('function');
      expect(typeof result.current.selectWallet).toBe('function');
      expect(typeof result.current.disconnectWallet).toBe('function');
      expect(typeof result.current.renameWallet).toBe('function');
      expect(typeof result.current.getBalance).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.setDefaultWalletId).toBe('function');
      expect(typeof result.current.getPreferredWalletId).toBe('function');
      expect(typeof result.current.setLastUsedWallet).toBe('function');
      expect(typeof result.current.isPending).toBe('function');
      expect(typeof result.current.clearActionError).toBe('function');
      expect(typeof result.current.retryAction).toBe('function');
    });
  });

  describe('wallet connection flow', () => {
    it('generateNonce delegates to SDK generateNonce and returns nonce', async () => {
      mockGenerateNonce.mockResolvedValueOnce({ nonce: 'test-nonce-123' });

      const { result } = renderHook(() => useWallet());
      const nonceResult = await result.current.generateNonce();

      expect(mockGenerateNonce).toHaveBeenCalledTimes(1);
      expect(nonceResult).toEqual({ nonce: 'test-nonce-123' });
    });

    it('handles generateNonce failure', async () => {
      mockGenerateNonce.mockRejectedValueOnce(new Error('Nonce generation failed'));

      const { result } = renderHook(() => useWallet());

      await expect(result.current.generateNonce()).rejects.toThrow('Nonce generation failed');
      expect(mockGenerateNonce).toHaveBeenCalledTimes(1);
    });

    it('getChallenge delegates to SDK getChallenge and returns challenge string', async () => {
      mockGetChallenge.mockResolvedValueOnce({ challenge: 'sign-this-message' });

      const { result } = renderHook(() => useWallet());
      const challengeResult = await result.current.getChallenge('test-key-1');

      expect(mockGetChallenge).toHaveBeenCalledWith('test-key-1');
      expect(challengeResult).toEqual({ challenge: 'sign-this-message' });
    });

    it('handles getChallenge failure', async () => {
      mockGetChallenge.mockRejectedValueOnce(new Error('Challenge request failed'));

      const { result } = renderHook(() => useWallet());

      await expect(result.current.getChallenge('test-key-1')).rejects.toThrow(
        'Challenge request failed'
      );
      expect(mockGetChallenge).toHaveBeenCalledWith('test-key-1');
    });

    it('verifyWallet delegates to SDK verifyWallet with signature payload', async () => {
      const verifyPayload = {
        publicKey: 'test-key-1',
        signature: 'valid-signature-abc',
        nonce: 'nonce-123',
      };
      mockVerifyWallet.mockResolvedValueOnce({ verified: true, walletId: '1' });

      const { result } = renderHook(() => useWallet());
      const verifyResult = await result.current.verifyWallet(verifyPayload);

      expect(mockVerifyWallet).toHaveBeenCalledWith(verifyPayload);
      expect(verifyResult).toEqual({ verified: true, walletId: '1' });
    });

    it('handles verifyWallet failure on invalid signature', async () => {
      const verifyPayload = {
        publicKey: 'test-key-1',
        signature: 'bad-signature',
        nonce: 'nonce-123',
      };
      mockVerifyWallet.mockRejectedValueOnce(
        makeSdkError('Signature verification failed', 'INVALID_SIGNATURE')
      );

      const { result } = renderHook(() => useWallet());

      await expect(result.current.verifyWallet(verifyPayload)).rejects.toThrow(
        'Signature verification failed'
      );
      expect(mockVerifyWallet).toHaveBeenCalledWith(verifyPayload);
    });

    it('fetchWallets invokes SDK listWallets', async () => {
      mockListWallets.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useWallet());
      await result.current.fetchWallets();

      expect(mockListWallets).toHaveBeenCalledTimes(1);
    });

    it('getBalance passes walletId to SDK getBalance', async () => {
      mockGetBalance.mockResolvedValueOnce({ available: 150, pending: 0, total: 150 });

      const { result } = renderHook(() => useWallet());
      const balance = await result.current.getBalance('1');

      expect(mockGetBalance).toHaveBeenCalledWith('1');
      expect(balance).toEqual({ available: 150, pending: 0, total: 150 });
    });

    it('reset passes through to SDK reset', () => {
      const { result } = renderHook(() => useWallet());
      result.current.reset();

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('wallet selection and preference logic', () => {
    it('selectWallet finds matching SDK wallet and calls sdkSelectWallet', () => {
      const sdkWallet = {
        id: '1',
        userId: 'user-1',
        publicKey: 'test-key-1',
        name: 'My Wallet',
        verified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ wallets: [sdkWallet] }));

      const { result } = renderHook(() => useWallet());

      const targetWallet: WalletInfo = {
        id: '1',
        publicKey: 'test-key-1',
        name: 'My Wallet',
        verified: true,
      };

      act(() => {
        result.current.selectWallet(targetWallet);
      });

      expect(mockSelectWallet).toHaveBeenCalledWith(sdkWallet);
    });

    it('selectWallet does not call sdkSelectWallet if wallet id is not in sdkWallets', () => {
      const { result } = renderHook(() => useWallet());

      const unknownWallet: WalletInfo = {
        id: 'unknown-id',
        publicKey: 'unknown-key',
        verified: false,
      };

      act(() => {
        result.current.selectWallet(unknownWallet);
      });

      expect(mockSelectWallet).not.toHaveBeenCalled();
    });

    it('preferredWallet is null when no defaultWalletId is set', () => {
      const { result } = renderHook(() => useWallet());

      expect(result.current.preferredWallet).toBeNull();
    });

    it('preferredWallet returns the matching wallet when defaultWalletId is found in wallets', () => {
      useWalletPreferenceStore.setState({ defaultWalletId: '1' });

      const { result } = renderHook(() => useWallet());

      expect(result.current.preferredWallet).toEqual({
        id: '1',
        publicKey: 'test-key-1',
        name: 'My Wallet',
        verified: true,
      });
    });

    it('preferredWallet returns null when defaultWalletId does not match any wallet', () => {
      useWalletPreferenceStore.setState({ defaultWalletId: 'non-existent-wallet' });

      const { result } = renderHook(() => useWallet());

      expect(result.current.preferredWallet).toBeNull();
    });

    it('setDefaultWalletId updates default wallet in store and preferredWallet reflects it', () => {
      const { result } = renderHook(() => useWallet());

      expect(result.current.preferredWallet).toBeNull();

      act(() => {
        result.current.setDefaultWalletId('1');
      });

      expect(useWalletPreferenceStore.getState().defaultWalletId).toBe('1');
      expect(result.current.preferredWallet?.id).toBe('1');
    });

    it('records and returns preferred wallet by creator ID', () => {
      const { result } = renderHook(() => useWallet());

      act(() => {
        result.current.setDefaultWalletId('default-wallet');
        result.current.setLastUsedWallet('creator-1', 'creator-wallet-1');
      });

      expect(result.current.getPreferredWalletId('creator-1')).toBe('creator-wallet-1');
      expect(result.current.getPreferredWalletId('creator-2')).toBe('default-wallet');
      expect(result.current.getPreferredWalletId('')).toBe('default-wallet');
    });

    it('getPreferredWalletId returns null when no creator history and no default wallet exist', () => {
      const { result } = renderHook(() => useWallet());

      expect(result.current.getPreferredWalletId('creator-unknown')).toBeNull();
    });
  });

  describe('localStorage persistence', () => {
    it('persists defaultWalletId to localStorage via zustand store', () => {
      const { result } = renderHook(() => useWallet());

      act(() => {
        result.current.setDefaultWalletId('stored-wallet-id');
      });

      const raw = localStorage.getItem('Dorisio-wallet-preference');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.defaultWalletId).toBe('stored-wallet-id');
    });

    it('persists per-creator last used wallet to localStorage', () => {
      const { result } = renderHook(() => useWallet());

      act(() => {
        result.current.setLastUsedWallet('creator-alpha', 'wallet-alpha');
        result.current.setLastUsedWallet('creator-beta', 'wallet-beta');
      });

      const raw = localStorage.getItem('Dorisio-wallet-preference');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.state.lastUsedWalletByCreator).toEqual({
        'creator-alpha': 'wallet-alpha',
        'creator-beta': 'wallet-beta',
      });
    });

    it('initializes preferredWallet correctly from pre-existing localStorage state', () => {
      localStorage.setItem(
        'Dorisio-wallet-preference',
        JSON.stringify({
          state: {
            defaultWalletId: '1',
            lastUsedWalletByCreator: { 'creator-xyz': '1' },
          },
          version: 0,
        })
      );

      // Rehydrate store from localStorage
      useWalletPreferenceStore.setState({
        defaultWalletId: '1',
        lastUsedWalletByCreator: { 'creator-xyz': '1' },
      });

      const { result } = renderHook(() => useWallet());

      expect(result.current.preferredWallet?.id).toBe('1');
      expect(result.current.getPreferredWalletId('creator-xyz')).toBe('1');
    });
  });

  describe('disconnection flow and optimistic updates', () => {
    it('optimistically removes the wallet immediately before SDK unlinkWallet resolves', async () => {
      let resolveUnlink!: () => void;
      const unlinkWallet = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveUnlink = resolve;
          })
      );
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ unlinkWallet }));

      const { result } = renderHook(() => useWallet());
      expect(result.current.wallets).toHaveLength(1);

      let disconnectPromise!: Promise<void>;
      act(() => {
        disconnectPromise = result.current.disconnectWallet('1');
      });

      expect(result.current.wallets).toHaveLength(0);
      expect(result.current.isPending('1')).toBe(true);

      resolveUnlink();
      await act(async () => {
        await disconnectPromise;
      });

      expect(result.current.isPending('1')).toBe(false);
      expect(unlinkWallet).toHaveBeenCalledWith('1');
    });

    it('rolls back wallet and surfaces error when disconnectWallet fails with Error instance', async () => {
      const unlinkWallet = vi.fn().mockRejectedValue(new Error('Network disconnected'));
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ unlinkWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.disconnectWallet('1')).rejects.toThrow('Network disconnected');
      });

      expect(result.current.wallets).toHaveLength(1);
      expect(result.current.isPending('1')).toBe(false);
      expect(result.current.actionError).toEqual({
        walletId: '1',
        message: 'Network disconnected',
      });
    });

    it('rolls back and sets fallback message when disconnectWallet fails with non-Error', async () => {
      const unlinkWallet = vi.fn().mockRejectedValue('Fatal network crash');
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ unlinkWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.disconnectWallet('1')).rejects.toBe('Fatal network crash');
      });

      expect(result.current.wallets).toHaveLength(1);
      expect(result.current.isPending('1')).toBe(false);
      expect(result.current.actionError).toEqual({
        walletId: '1',
        message: 'Failed to disconnect wallet',
      });
    });
  });

  describe('rename flow and optimistic updates', () => {
    it('optimistically updates wallet name immediately before SDK renameWallet resolves', async () => {
      let resolveRename!: (wallet: Wallet) => void;
      const renameWallet = vi.fn(
        () =>
          new Promise<Wallet>((resolve) => {
            resolveRename = resolve;
          })
      );
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ renameWallet }));

      const { result } = renderHook(() => useWallet());

      let renamePromise!: Promise<void>;
      act(() => {
        renamePromise = result.current.renameWallet('1', 'Optimistic New Name');
      });

      expect(result.current.wallets[0].name).toBe('Optimistic New Name');
      expect(result.current.selectedWallet?.name).toBe('Optimistic New Name');
      expect(result.current.isPending('1')).toBe(true);

      resolveRename({
        id: '1',
        userId: 'user-1',
        publicKey: 'test-key-1',
        name: 'Optimistic New Name',
        verified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
      await act(async () => {
        await renamePromise;
      });

      expect(result.current.isPending('1')).toBe(false);
      expect(renameWallet).toHaveBeenCalledWith('1', 'Optimistic New Name');
    });

    it('rolls back to previous name and surfaces error when renameWallet fails with Error', async () => {
      const renameWallet = vi.fn().mockRejectedValue(new Error('Name already taken'));
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ renameWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.renameWallet('1', 'Invalid Name')).rejects.toThrow(
          'Name already taken'
        );
      });

      expect(result.current.wallets[0].name).toBe('My Wallet');
      expect(result.current.isPending('1')).toBe(false);
      expect(result.current.actionError).toEqual({
        walletId: '1',
        message: 'Name already taken',
      });
    });

    it('rolls back and sets fallback message when renameWallet fails with non-Error', async () => {
      const renameWallet = vi.fn().mockRejectedValue('server rejected');
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ renameWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.renameWallet('1', 'New Name')).rejects.toBe('server rejected');
      });

      expect(result.current.wallets[0].name).toBe('My Wallet');
      expect(result.current.isPending('1')).toBe(false);
      expect(result.current.actionError).toEqual({
        walletId: '1',
        message: 'Failed to rename wallet',
      });
    });
  });

  describe('retryAction and error recovery', () => {
    it('retryAction without name retries disconnectWallet and clears error on success', async () => {
      const unlinkWallet = vi
        .fn()
        .mockRejectedValueOnce(new Error('Connection timed out'))
        .mockResolvedValueOnce(undefined);
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ unlinkWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.disconnectWallet('1')).rejects.toThrow(
          'Connection timed out'
        );
      });
      expect(result.current.actionError?.message).toBe('Connection timed out');

      await act(async () => {
        await result.current.retryAction('1');
      });

      expect(result.current.actionError).toBeNull();
      expect(unlinkWallet).toHaveBeenCalledTimes(2);
    });

    it('retryAction with name retries renameWallet and clears error on success', async () => {
      const renamedWallet: Wallet = {
        id: '1',
        userId: 'user-1',
        publicKey: 'test-key-1',
        name: 'Retried Name',
        verified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const renameWallet = vi
        .fn()
        .mockRejectedValueOnce(new Error('Temporary glitch'))
        .mockResolvedValueOnce(renamedWallet);
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ renameWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.renameWallet('1', 'Retried Name')).rejects.toThrow(
          'Temporary glitch'
        );
      });
      expect(result.current.actionError?.message).toBe('Temporary glitch');

      await act(async () => {
        await result.current.retryAction('1', 'Retried Name');
      });

      expect(result.current.actionError).toBeNull();
      expect(renameWallet).toHaveBeenCalledTimes(2);
    });

    it('clearActionError resets actionError without retrying', async () => {
      const unlinkWallet = vi.fn().mockRejectedValue(new Error('Unauthorized'));
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ unlinkWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.disconnectWallet('1')).rejects.toThrow('Unauthorized');
      });
      expect(result.current.actionError).not.toBeNull();

      act(() => {
        result.current.clearActionError();
      });

      expect(result.current.actionError).toBeNull();
      expect(unlinkWallet).toHaveBeenCalledTimes(1);
    });

    it('clears previous actionError when a new disconnect is initiated', async () => {
      const unlinkWallet = vi
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce(undefined);
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ unlinkWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.disconnectWallet('1')).rejects.toThrow('First failure');
      });
      expect(result.current.actionError?.message).toBe('First failure');

      await act(async () => {
        await result.current.disconnectWallet('1');
      });
      expect(result.current.actionError).toBeNull();
    });

    it('clears previous actionError when a new rename is initiated', async () => {
      const renamedWallet: Wallet = {
        id: '1',
        userId: 'user-1',
        publicKey: 'test-key-1',
        name: 'Fresh Name',
        verified: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const renameWallet = vi
        .fn()
        .mockRejectedValueOnce(new Error('Initial failure'))
        .mockResolvedValueOnce(renamedWallet);
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ renameWallet }));

      const { result } = renderHook(() => useWallet());

      await act(async () => {
        await expect(result.current.renameWallet('1', 'New Name')).rejects.toThrow(
          'Initial failure'
        );
      });
      expect(result.current.actionError?.message).toBe('Initial failure');

      await act(async () => {
        await result.current.renameWallet('1', 'Fresh Name');
      });
      expect(result.current.actionError).toBeNull();
    });
  });

  describe('pending state management', () => {
    it('isPending correctly tracks the active wallet id and ignores others', async () => {
      let resolveUnlink!: () => void;
      const unlinkWallet = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveUnlink = resolve;
          })
      );
      vi.mocked(sdkUseWallet).mockReturnValue(buildSDKResult({ unlinkWallet }));

      const { result } = renderHook(() => useWallet());
      expect(result.current.isPending('1')).toBe(false);
      expect(result.current.isPending('2')).toBe(false);

      let disconnectPromise!: Promise<void>;
      act(() => {
        disconnectPromise = result.current.disconnectWallet('1');
      });

      expect(result.current.isPending('1')).toBe(true);
      expect(result.current.isPending('2')).toBe(false);

      resolveUnlink();
      await act(async () => {
        await disconnectPromise;
      });

      expect(result.current.isPending('1')).toBe(false);
      expect(result.current.isPending('2')).toBe(false);
    });
  });
});
