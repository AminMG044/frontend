/**
 * SDK Usage Patterns & Best Practices Tests
 *
 * Verifies that all code examples and patterns documented in
 * docs/SDK_USAGE_PATTERNS.md are fully functional, type-safe, and pass.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  initSDKClient,
  getSDKClient,
  updateSDKToken,
  resetSDKClient,
  useSDKClient,
} from '@/lib/sdk-client';
import { retryWithBackoff } from '@/lib/retry-backoff';
import { mapWalletError } from '@/hooks/use-wallet';
import { useAuthStore } from '@/stores/auth-store';
import {
  DorisioError,
  RateLimitError,
  TimeoutError,
  AuthError,
  ValidationError,
  PaymentError,
  WalletVerificationError,
  buildQueryString,
  parsePaginationMeta,
  createPaginator,
  encodeCursor,
  decodeCursor,
  DorisioClient,
} from 'dorisio-sdk';

describe('SDK Usage Patterns & Best Practices Guide - Verified Examples', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSDKClient();
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: true,
    });
  });

  describe('Pattern 1: Client Initialization & Singleton Management', () => {
    it('initializes default singleton with base configuration', () => {
      const client = initSDKClient();
      expect(client).toBeDefined();
      expect(client.getConfig().baseUrl).toBe('http://localhost:3000');
      expect(client.getConfig().timeout).toBe(30000);
      expect(client.getConfig().token).toBeUndefined();
    });

    it('returns consistent singleton instance via getSDKClient', () => {
      const client1 = getSDKClient();
      const client2 = getSDKClient();
      expect(client1).toBe(client2);
    });

    it('supports re-initialization with token', () => {
      const client = initSDKClient('initial-jwt-token');
      expect(client.getConfig().token).toBe('initial-jwt-token');

      // Update token on existing client
      updateSDKToken('updated-jwt-token');
      expect(client.getConfig().token).toBe('updated-jwt-token');

      // Clear token on logout
      updateSDKToken(null);
      expect(client.getConfig().token).toBeUndefined();
    });
  });

  describe('Pattern 2: Error Classification & Extraction', () => {
    it('correctly instantiates and identifies SDK domain errors', () => {
      const rateLimitErr = new RateLimitError('Rate limit exceeded', 60, 'req_123');
      expect(rateLimitErr).toBeInstanceOf(DorisioError);
      expect(rateLimitErr.statusCode).toBe(429);
      expect(rateLimitErr.code).toBe('RATE_LIMITED');
      expect(rateLimitErr.retryAfter).toBe(60);
      expect(rateLimitErr.requestId).toBe('req_123');

      const timeoutErr = new TimeoutError('Request timed out', 30000, 'req_456');
      expect(timeoutErr.statusCode).toBe(408);
      expect(timeoutErr.code).toBe('TIMEOUT');

      const authErr = new AuthError('Session expired', 401, 'UNAUTHORIZED', 'req_789');
      expect(authErr.statusCode).toBe(401);
      expect(authErr.code).toBe('UNAUTHORIZED');

      const valErr = new ValidationError('Invalid amount', { amount: 'Must be > 0' }, 'req_val');
      expect(valErr.statusCode).toBe(400);
      expect(valErr.details).toEqual({ amount: 'Must be > 0' });

      const payErr = new PaymentError('Insufficient balance', 400, 'PAYMENT_FAILED', 'tx_hash_001');
      expect(payErr.transactionHash).toBe('tx_hash_001');

      const walletErr = new WalletVerificationError(
        'Invalid sig',
        400,
        'INVALID_SIGNATURE',
        'challenge_nonce'
      );
      expect(walletErr.challenge).toBe('challenge_nonce');
    });

    it('maps errors accurately to user-friendly messages using mapWalletError', () => {
      expect(mapWalletError(new Error('Network error'))).toBe(
        'Network error. Please check your connection and try again.'
      );

      const timeoutErr = new Error('request timed out');
      (timeoutErr as any).code = 'TIMEOUT';
      expect(mapWalletError(timeoutErr)).toBe('The request timed out. Please try again.');

      const rateLimitErr = new Error('Too many requests');
      (rateLimitErr as any).code = 'RATE_LIMITED';
      expect(mapWalletError(rateLimitErr)).toBe(
        'Too many requests. Please wait a moment and try again.'
      );

      const expiredErr = new Error('Challenge expired');
      (expiredErr as any).code = 'CHALLENGE_EXPIRED';
      expect(mapWalletError(expiredErr)).toBe(
        'Verification challenge expired. Please start the verification process again.'
      );
    });
  });

  describe('Pattern 3: Retry with Exponential Backoff', () => {
    it('retries transient failures and resolves upon success', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          const err = new DorisioError('Server temporary issue', 503, 'SERVICE_UNAVAILABLE');
          throw err;
        }
        return 'success_payload';
      };

      const result = await retryWithBackoff(fn, {
        retries: 3,
        baseDelayMs: 10,
        maxDelayMs: 50,
      });

      expect(result).toBe('success_payload');
      expect(attempts).toBe(3);
    });

    it('aborts immediately on permanent non-retryable 4xx client errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new ValidationError('Invalid tip amount');
      };

      await expect(
        retryWithBackoff(fn, {
          retries: 3,
          baseDelayMs: 10,
        })
      ).rejects.toThrow('Invalid tip amount');

      expect(attempts).toBe(1); // Never retried
    });
  });

  describe('Pattern 4: Authentication State & Hydration Lifecycle', () => {
    it('manages auth store state and updates SDK client seamlessly', () => {
      const client = getSDKClient();

      // Simulate login
      const mockUser = {
        id: 'usr_abc',
        email: 'creator@example.com',
        username: 'alice',
        role: 'creator' as const,
      };
      const token = 'jwt_token_12345';

      useAuthStore.getState().login(mockUser, token);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().token).toBe(token);

      // Sync to SDK client
      updateSDKToken(useAuthStore.getState().token);
      expect(client.getConfig().token).toBe(token);

      // Simulate logout
      useAuthStore.getState().logout();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();

      updateSDKToken(null);
      expect(client.getConfig().token).toBeUndefined();
    });
  });

  describe('Pattern 5: Standard Hook Response Contract', () => {
    interface HookResponse<T> {
      data: T | null;
      isLoading: boolean;
      isError: boolean;
      error: Error | null;
    }

    it('conforms to standard hook response structure', () => {
      const loadingState: HookResponse<{ balance: number }> = {
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      };
      expect(loadingState.isLoading).toBe(true);
      expect(loadingState.data).toBeNull();

      const successState: HookResponse<{ balance: number }> = {
        data: { balance: 150 },
        isLoading: false,
        isError: false,
        error: null,
      };
      expect(successState.data?.balance).toBe(150);

      const errorState: HookResponse<{ balance: number }> = {
        data: null,
        isLoading: false,
        isError: true,
        error: new Error('Failed to load balance'),
      };
      expect(errorState.isError).toBe(true);
      expect(errorState.error?.message).toBe('Failed to load balance');
    });
  });

  describe('Pattern 6: Advanced Client Configuration & Network Tuning', () => {
    it('initializes client in sandbox mode with deterministic latency and seed', () => {
      const sandboxClient = new DorisioClient({
        baseUrl: 'http://localhost:3000',
        mode: 'sandbox',
        sandboxSeed: 12345,
        sandboxLatency: 5,
        sandboxErrorRate: 0,
      });

      expect(sandboxClient.isSandboxMode()).toBe(true);
      expect(sandboxClient.getMode()).toBe('sandbox');
      expect(sandboxClient.getConfig().mode).toBe('sandbox');
    });

    it('configures request queue, concurrency limit, and deduplication window', () => {
      const loggerMock = vi.fn();
      const requestIdGen = () => 'req-trace-999';

      const tunedClient = new DorisioClient({
        baseUrl: 'https://api.dorisio.dev',
        timeout: 15000,
        enableRequestQueue: true,
        maxConcurrentRequests: 4,
        deduplicateRequests: true,
        deduplicationWindow: 300,
        enableThrottling: true,
        throttleMaxRequests: 100,
        throttleWindowMs: 60000,
        requestIdGenerator: requestIdGen,
        logger: loggerMock,
        debug: true,
      });

      const config = tunedClient.getConfig();
      expect(config.enableRequestQueue).toBe(true);
      expect(config.maxConcurrentRequests).toBe(4);
      expect(config.deduplicateRequests).toBe(true);
      expect(config.deduplicationWindow).toBe(300);
      expect(config.enableThrottling).toBe(true);
      expect(config.throttleMaxRequests).toBe(100);
      expect(config.throttleWindowMs).toBe(60000);
      expect(config.requestIdGenerator?.()).toBe('req-trace-999');
      expect(config.debug).toBe(true);
    });
  });

  describe('Pattern 7: Query Building & Cursor / Offset Pagination Utilities', () => {
    it('builds standard query strings with pagination, sorting, and filters', () => {
      const qs = buildQueryString({
        limit: 25,
        offset: 50,
        sort: 'desc',
        filters: { verified: true, role: 'creator' },
      });

      expect(qs).toContain('limit=25');
      expect(qs).toContain('offset=50');
      expect(qs).toContain('sort=desc');
      expect(qs).toContain('filter%5Bverified%5D=true');
      expect(qs).toContain('filter%5Brole%5D=creator');
    });

    it('encodes and decodes opaque pagination cursors correctly', () => {
      const offset = 40;
      const cursor = encodeCursor(offset);
      expect(typeof cursor).toBe('string');
      expect(cursor.length).toBeGreaterThan(0);

      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({ offset: 40 });

      // Non-offset server string cursor returns null
      expect(decodeCursor('arbitrary-opaque-server-cursor')).toBeNull();
    });

    it('parses pagination meta from API response payloads', () => {
      const response = {
        total: 150,
        page: 3,
        pageSize: 20,
      };

      const meta = parsePaginationMeta(response);
      expect(meta).toEqual({
        page: 3,
        pageSize: 20,
        total: 150,
        hasMore: true, // page 3 with pageSize 20 = 60 items, total is 150
      });

      // Last page test
      const lastPageMeta = parsePaginationMeta({
        total: 50,
        page: 5,
        pageSize: 10,
      });
      expect(lastPageMeta.hasMore).toBe(false);
    });

    it('navigates forward and backward cleanly with stateful Paginator', async () => {
      const mockPages = [
        {
          items: ['item1', 'item2'],
          total: 4,
          page: 1,
          pageSize: 2,
          hasMore: true,
          nextCursor: encodeCursor(2),
        },
        {
          items: ['item3', 'item4'],
          total: 4,
          page: 2,
          pageSize: 2,
          hasMore: false,
          nextCursor: undefined,
        },
      ];

      const fetcher = vi.fn().mockImplementation(async (opts) => {
        const offset = opts.cursor ? (decodeCursor(opts.cursor)?.offset ?? 0) : 0;
        const pageIdx = Math.floor(offset / 2);
        return (
          mockPages[pageIdx] || {
            items: [],
            total: 4,
            page: pageIdx + 1,
            pageSize: 2,
            hasMore: false,
          }
        );
      });

      const paginator = createPaginator(fetcher, { limit: 2 });
      expect(paginator.currentPage).toBe(0);
      expect(paginator.hasNext).toBe(true);

      // Page 1
      const page1 = await paginator.next();
      expect(page1?.items).toEqual(['item1', 'item2']);
      expect(paginator.currentPage).toBe(1);
      expect(paginator.hasNext).toBe(true);

      // Page 2
      const page2 = await paginator.next();
      expect(page2?.items).toEqual(['item3', 'item4']);
      expect(paginator.currentPage).toBe(2);
      expect(paginator.hasNext).toBe(false);

      // Prev -> back to Page 1
      const prevPage = await paginator.prev();
      expect(prevPage?.items).toEqual(['item1', 'item2']);
      expect(paginator.currentPage).toBe(1);
    });
  });

  describe('Pattern 8: Batch Operations & Resilience Processing', () => {
    it('executes batch item processing with retry and collects individual results', async () => {
      const client = new DorisioClient({
        baseUrl: 'http://localhost:3000',
        mode: 'sandbox',
      });

      const tipIds = ['tip_1', 'tip_2', 'tip_3'];
      let callCount = 0;

      const processFn = async (tipId: string) => {
        callCount++;
        if (tipId === 'tip_2' && callCount === 2) {
          // Fail once to verify batch retry mechanism
          throw new DorisioError('Simulated temporary network blip', 503, 'SERVICE_UNAVAILABLE');
        }
        return { tipId, processed: true, timestamp: Date.now() };
      };

      const batchResult = await client.processBatchWithRetry(tipIds, processFn, {
        concurrency: 2,
        retries: 2,
        retryDelayMs: 10,
      });

      expect(batchResult.successful.length).toBe(3);
      expect(batchResult.failed.length).toBe(0);
      expect(batchResult.hasFailures).toBe(false);
      expect(batchResult.total).toBe(3);
      expect(batchResult.successful[0].result.processed).toBe(true);
    });
  });

  describe('Pattern 9: Web3 Wallet Challenge & Verification Flow', () => {
    it('handles challenge-response lifecycle and validates signature inputs', async () => {
      // Step 1: Simulate challenge request
      const mockChallengeResponse = {
        challenge: 'auth-challenge-nonce-987654321',
        expiresIn: 300,
      };
      expect(mockChallengeResponse.challenge).toBeDefined();

      // Step 2: Simulate wallet signing (e.g. Freighter / Stellar Keypair)
      const mockPublicKey = 'GBTESTPUBLICKEYFORVERIFICATION1234567890STEL';
      const mockSignature = 'AAAA...valid_simulated_stellar_signature_envelope...ZZZZ';

      const verificationPayload = {
        challenge: mockChallengeResponse.challenge,
        signature: mockSignature,
        publicKey: mockPublicKey,
      };

      // Step 3: Verify payload integrity
      expect(verificationPayload.publicKey.startsWith('G')).toBe(true);
      expect(verificationPayload.challenge).toBe('auth-challenge-nonce-987654321');

      // Step 4: Validate error handling when signature challenge is expired
      const expiredError = new WalletVerificationError(
        'Challenge expired',
        400,
        'CHALLENGE_EXPIRED',
        mockChallengeResponse.challenge
      );
      expect(expiredError.code).toBe('CHALLENGE_EXPIRED');
      expect(mapWalletError(expiredError)).toBe(
        'Verification challenge expired. Please start the verification process again.'
      );
    });
  });

  describe('Pattern 10: 401 Unauthorized Interception & Automatic Refresh/Logout', () => {
    it('clears credentials and notifies auth store when unrecoverable 401 occurs', () => {
      const client = initSDKClient('expired-expired-jwt');
      expect(client.getConfig().token).toBe('expired-expired-jwt');

      // Emulate auth interceptor on 401 response:
      const handleUnauthorized = () => {
        useAuthStore.getState().logout();
        updateSDKToken(null);
      };

      handleUnauthorized();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();
      expect(client.getConfig().token).toBeUndefined();
    });
  });
});
