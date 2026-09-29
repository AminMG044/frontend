# Dorisio SDK Usage Patterns & Best Practices Guide

Comprehensive guide for developers integrating the Dorisio SDK (`dorisio-sdk`) within the Dorisio frontend web application.

---

## Table of Contents

1. [Architecture & Design Philosophy](#1-architecture--design-philosophy)
   - [The "Frontend Stays Dumb" Principle](#the-frontend-stays-dumb-principle)
   - [Layered Architecture Overview](#layered-architecture-overview)
   - [SDK Rules of Engagement](#sdk-rules-of-engagement)
2. [SDK Initialization Patterns](#2-sdk-initialization-patterns)
   - [Pattern 1: React Context Provider (`DorisioProvider`)](#pattern-1-react-context-provider-dorisioprovider)
   - [Pattern 2: Application Singleton (`sdk-client.ts`)](#pattern-2-application-singleton-sdk-clientts)
   - [Pattern 3: React Hook (`useSDKClient`)](#pattern-3-react-hook-usesdkclient)
   - [SSR vs. CSR Considerations](#ssr-vs-csr-considerations)
   - [Deterministic Sandbox & Mock Mode](#deterministic-sandbox--mock-mode)
3. [Configuration Examples](#3-configuration-examples)
   - [Environment Variables Matrix](#environment-variables-matrix)
   - [Base Development & Production Profiles](#base-development--production-profiles)
   - [Network Resilience & Timeout Management](#network-resilience--timeout-management)
   - [Request Queue & Concurrency Throttling](#request-queue--concurrency-throttling)
   - [Request Deduplication & Caching Window](#request-deduplication--caching-window)
   - [Diagnostics, Custom Logger & Request ID Tracking](#diagnostics-custom-logger--request-id-tracking)
   - [API Version Migration & Deprecation Alerts](#api-version-migration--deprecation-alerts)
4. [Authentication Flows](#4-authentication-flows)
   - [Session Hydration & Auth Store Synchronization](#session-hydration--auth-store-synchronization)
   - [Web3 Stellar / Freighter Wallet Challenge & Verification](#web3-stellar--freighter-wallet-challenge--verification)
   - [Handling 401 Unauthorized & Token Refresh Loop](#handling-401-unauthorized--token-refresh-loop)
   - [Clean Logout & Credential Eviction](#clean-logout--credential-eviction)
5. [Error Handling Best Practices](#5-error-handling-best-practices)
   - [SDK Domain Error Hierarchy](#sdk-domain-error-hierarchy)
   - [Standard Hook Response Contract](#standard-hook-response-contract)
   - [Exponential Backoff with Jitter for Transient Errors](#exponential-backoff-with-jitter-for-transient-errors)
   - [User-Facing Error Message Mapping](#user-facing-error-message-mapping)
   - [Error Monitoring & Sentry Integration](#error-monitoring--sentry-integration)
6. [Querying, Pagination & Batch Operations](#6-querying-pagination--batch-operations)
   - [URL Query Builder (`buildQueryString`)](#url-query-builder-buildquerystring)
   - [Cursor & Offset Pagination Utilities](#cursor--offset-pagination-utilities)
   - [Bi-Directional Stateful Paginator (`createPaginator`)](#bi-directional-stateful-paginator-createpaginator)
   - [Batch Processing with Partial Failure Isolation](#batch-processing-with-partial-failure-isolation)
7. [Troubleshooting Guide](#7-troubleshooting-guide)
   - [Quick Diagnostics Matrix](#quick-diagnostics-matrix)
   - [Detailed Problem Solutions](#detailed-problem-solutions)
8. [Performance Optimization Tips](#8-performance-optimization-tips)
   - [In-Flight Request Deduplication](#in-flight-request-deduplication)
   - [TanStack Server State vs. Zustand Client State](#tanstack-server-state-vs-zustand-client-state)
   - [Parallel Batch Queries vs. Waterfall Requests](#parallel-batch-queries-vs-waterfall-requests)
   - [Optimistic UI Updates for Tip Creation](#optimistic-ui-updates-for-tip-creation)
   - [Tree-Shaking & Bundle Splitting](#tree-shaking--bundle-splitting)

---

## 1. Architecture & Design Philosophy

### The "Frontend Stays Dumb" Principle

In the Dorisio platform, the frontend is strictly a **presentation layer**. The client application does not calculate platform fees, assemble raw Stellar transactions manually, or make business logic decisions.

> [!IMPORTANT]
> **Core Rule:** All data fetching and mutations targeting core Dorisio resources (users, creators, tips, wallets, payouts) **must** go through `dorisio-sdk`. Direct `fetch()` calls to backend endpoints (e.g. `http://api.dorisio.com/api/v1/...`) inside UI components are strictly forbidden.

#### Prohibited vs. Required Patterns

❌ **DO NOT:** Embed fee calculations or direct backend URLs in UI components:

```tsx
// Anti-pattern: Business logic and raw fetch in frontend component
const fee = amount * 0.025;
const total = amount + fee;

const response = await fetch('https://api.dorisio.dev/api/v1/tips', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ creatorId, amount, total }),
});
```

✅ **DO:** Delegate orchestration to the SDK:

```tsx
// Recommended: Clean delegation through SDK
const client = useSDKClient();
const tip = await client.createTip({
  creatorId,
  amount,
  currency: 'USD',
  message: 'Keep creating!',
});
```

### Layered Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 React Presentation Layer                    │
│   (Next.js App Router, Tailwind UI Components, Modals)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 React Hooks & Context Layer                 │
│      (useCreateTip, useWallet, useCreatorBalance,           │
│       DorisioProvider, useSDKClient, TanStack Query)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Dorisio SDK Client Core                     │
│    (DorisioClient, Token Manager, Request Queue,            │
│     Batch Processor, Error Normalizer, Retry Engine)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Dorisio REST API        │ │      Stellar Horizon       │
│  (Auth, Creators, Analytics) │ │ (Tx Submission & Tracking) │
└──────────────────────────────┘ └────────────────────────────┘
```

### SDK Rules of Engagement

1. **Singleton Access:** Always reuse the shared SDK client instance via `useSDKClient()` or `getSDKClient()` rather than creating `new DorisioClient()` inside component render loops.
2. **Token Synchronization:** When authentication state changes in Zustand (`useAuthStore`), update the client via `updateSDKToken()` or `client.setToken()`.
3. **Strict Typing:** Always leverage the TypeScript interfaces exported by `dorisio-sdk` (`Creator`, `Transaction`, `Wallet`, `BalanceInfo`, `ClientConfig`).
4. **Normalized Error Handling:** Catch SDK-native error instances (`DorisioError`, `RateLimitError`, `AuthError`, `WalletVerificationError`) and render user-friendly alert banners.

---

## 2. SDK Initialization Patterns

Depending on whether you are working within a React component tree, an event handler, or a server-side route handler, choose the appropriate pattern below.

### Pattern 1: React Context Provider (`DorisioProvider`)

Wrap your application tree in `src/app/providers.tsx` using `DorisioProvider` from `dorisio-sdk/react`. This exposes context-level error management, client instance sharing, and unified auth state.

```tsx
// src/app/providers.tsx
'use client';

import { ReactNode, useMemo, useCallback } from 'react';
import { DorisioClient, type ClientConfig } from 'dorisio-sdk';
import { DorisioProvider } from 'dorisio-sdk/react';
import { useAuthHydration } from '@/hooks/use-auth-hydration';

export function Providers({ children }: { children: ReactNode }) {
  // 1. Instantiate client with environment configuration
  const dorisioClient = useMemo(() => {
    return new DorisioClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      timeout: 30000,
    });
  }, []);

  // 2. Sync token once localStorage auth state has hydrated
  const syncToken = useCallback(
    (token: string | null) => {
      if (token) {
        dorisioClient.setToken(token);
      } else {
        dorisioClient.clearToken();
      }
    },
    [dorisioClient]
  );

  const { hasHydrated } = useAuthHydration(syncToken);

  if (!hasHydrated) {
    return <div className="spinner">Initializing...</div>;
  }

  return (
    <DorisioProvider client={dorisioClient} config={dorisioClient.getConfig()}>
      {children}
    </DorisioProvider>
  );
}
```

### Pattern 2: Application Singleton (`sdk-client.ts`)

For utilities, Zustand stores, background tasks, or Next.js API routes that execute outside the React component tree, access the singleton instance defined in `src/lib/sdk-client.ts`:

```ts
// src/lib/sdk-client.ts
import { DorisioClient } from 'dorisio-sdk';
import { useAuthStore } from '@/stores/auth-store';

let sdkClient: DorisioClient | null = null;

function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.API_URL || 'http://localhost:3000';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

export function initSDKClient(token?: string): DorisioClient {
  if (sdkClient) {
    if (token && sdkClient.getConfig().token !== token) {
      sdkClient.setToken(token);
    } else if (!token && sdkClient.getConfig().token) {
      sdkClient.clearToken();
    }
    return sdkClient;
  }

  const baseUrl = getBaseUrl();
  const authToken = token || useAuthStore.getState().token || undefined;

  sdkClient = new DorisioClient({
    baseUrl,
    token: authToken,
    timeout: 30000,
  });

  return sdkClient;
}

export function getSDKClient(): DorisioClient {
  if (!sdkClient) {
    return initSDKClient();
  }
  return sdkClient;
}

export function updateSDKToken(token: string | null): void {
  const client = getSDKClient();
  if (token) {
    client.setToken(token);
  } else {
    client.clearToken();
  }
}

export function resetSDKClient(): void {
  sdkClient = null;
}
```

### Pattern 3: React Hook (`useSDKClient`)

Inside React functional components, consume the client using `useSDKClient()`:

```tsx
import { useSDKClient } from '@/lib/sdk-client';
import { useState } from 'react';

export function CreatorTipWidget({ creatorId }: { creatorId: string }) {
  const sdk = useSDKClient();
  const [submitting, setSubmitting] = useState(false);

  const handleSendTip = async () => {
    setSubmitting(true);
    try {
      const tx = await sdk.createTip({
        creatorId,
        amount: 25,
        currency: 'USD',
        message: 'Great work!',
      });
      console.log('Tip sent:', tx.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button disabled={submitting} onClick={handleSendTip}>
      {submitting ? 'Sending...' : 'Send $25 Tip'}
    </button>
  );
}
```

### SSR vs. CSR Considerations

Next.js App Router renders both on the server (SSR / SSG) and the browser (CSR):

- **Server execution:** `typeof window === 'undefined'`. Read private `process.env.API_URL`. Do not attempt to read `localStorage`.
- **Browser execution:** `typeof window !== 'undefined'`. Read `process.env.NEXT_PUBLIC_API_URL`. Read auth tokens only after Zustand store hydration.

```ts
// Safe runtime endpoint selection
const baseUrl =
  typeof window === 'undefined'
    ? process.env.API_URL || 'http://localhost:3000'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
```

### Deterministic Sandbox & Mock Mode

For local development without a running backend, end-to-end testing, or Storybook components, configure the SDK in `sandbox` mode. In sandbox mode, no network requests are dispatched; all responses return deterministic mock payloads.

```ts
import { DorisioClient } from 'dorisio-sdk';

// Deterministic sandbox instance
export const mockClient = new DorisioClient({
  baseUrl: 'http://localhost:3000',
  mode: 'sandbox',
  sandboxSeed: 42, // Deterministic responses across runs
  sandboxLatency: 150, // Simulated network latency in ms
  sandboxErrorRate: 0, // 0.0 (no errors) to 1.0 (all requests fail)
});

console.log(mockClient.isSandboxMode()); // true
```

---

## 3. Configuration Examples

### Environment Variables Matrix

| Variable                             | Environment            | Default                               | Description                                         |
| :----------------------------------- | :--------------------- | :------------------------------------ | :-------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`                | Public (Client/Server) | `http://localhost:3000`               | Dorisio REST API endpoint.                          |
| `NEXT_PUBLIC_STELLAR_NETWORK`        | Public (Client/Server) | `testnet`                             | Target Stellar network: `testnet` or `mainnet`.     |
| `NEXT_PUBLIC_STELLAR_HORIZON_URL`    | Public (Client/Server) | `https://horizon-testnet.stellar.org` | Horizon node URL for transaction verification.      |
| `API_URL`                            | Private (Server-only)  | `http://localhost:3000`               | Internal backend endpoint for SSR / route handlers. |
| `NEXT_PUBLIC_ENABLE_ANALYTICS`       | Public                 | `false`                               | Enables client analytics collection.                |
| `NEXT_PUBLIC_ENABLE_ERROR_REPORTING` | Public                 | `false`                               | Enables Sentry / automated error reporting.         |

### Base Development & Production Profiles

#### Development Configuration (`.env.local`)

```ini
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

#### Production Configuration (Vercel Environment)

```ini
NEXT_PUBLIC_API_URL=https://api.dorisio.dev
NEXT_PUBLIC_STELLAR_NETWORK=mainnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon.stellar.org
NEXT_PUBLIC_ENABLE_ERROR_REPORTING=true
```

### Network Resilience & Timeout Management

Configure the HTTP client timeout and retry options to protect against slow mobile networks:

```ts
import { DorisioClient } from 'dorisio-sdk';

export const resilientClient = new DorisioClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  timeout: 15000, // 15 seconds request timeout (defaults to 30000ms)
});
```

### Request Queue & Concurrency Throttling

Prevent mobile browsers and backend APIs from being saturated by setting concurrency limits:

```ts
import { DorisioClient } from 'dorisio-sdk';

export const queuedClient = new DorisioClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  // Enable internal request queue
  enableRequestQueue: true,
  // Limit concurrent in-flight HTTP requests
  maxConcurrentRequests: 4,
  // Rate-limiting throttle configuration
  enableThrottling: true,
  throttleMaxRequests: 60,
  throttleWindowMs: 60000, // 60 requests per minute
});
```

### Request Deduplication & Caching Window

If multiple React components request the same resource simultaneously (e.g. creator profile or balance), the SDK collapses them into a single HTTP call:

```ts
import { DorisioClient } from 'dorisio-sdk';

export const deduplicatingClient = new DorisioClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  deduplicateRequests: true,
  deduplicationWindow: 300, // deduplication window in ms
});
```

### Diagnostics, Custom Logger & Request ID Tracking

Attach custom loggers and distributed request ID generators for telemetry:

```ts
import { DorisioClient } from 'dorisio-sdk';

export const observableClient = new DorisioClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  debug: process.env.NODE_ENV === 'development',
  logger: (message, data) => {
    console.debug(`[Dorisio-SDK] ${message}`, data);
  },
  requestIdGenerator: () => {
    return `dorisio-req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  },
});
```

### API Version Migration & Deprecation Alerts

Track API changes proactively using the version migration hooks:

```ts
import { DorisioClient } from 'dorisio-sdk';

export const versionedClient = new DorisioClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  apiVersion: '2024-04-01',
  onApiDeprecation: (warning) => {
    console.warn(
      `[API Deprecation Warning]: Endpoint ${warning.endpoint} is deprecated. Migrate to ${warning.migrationTarget} before ${warning.sunsetDate}.`
    );
  },
});
```

---

## 4. Authentication Flows

### Session Hydration & Auth Store Synchronization

The frontend stores tokens in `localStorage` under `dorisio-auth` via Zustand's `persist` middleware. Because `localStorage` is asynchronous during hydration, the app must guard against rendering authenticated routes prematurely.

```tsx
// src/hooks/use-auth-hydration.ts
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export function useAuthHydration(onHydrated?: (token: string | null) => void) {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      const token = useAuthStore.getState().token;
      onHydrated?.(token);
      setHasHydrated(true);
    });

    if (useAuthStore.persist.hasHydrated()) {
      const token = useAuthStore.getState().token;
      onHydrated?.(token);
      setHasHydrated(true);
    }

    return () => unsub();
  }, [onHydrated]);

  return { hasHydrated };
}
```

### Web3 Stellar / Freighter Wallet Challenge & Verification

Wallet linking requires proving ownership of a Stellar keypair using a cryptographic challenge-response signature.

```
┌──────────────┐          ┌──────────────┐          ┌────────────────┐
│   Browser    │          │ Dorisio SDK  │          │ Dorisio Backend│
│  (Freighter) │          │              │          │                │
└──────┬───────┘          └──────┬───────┘          └────────┬───────┘
       │                         │                           │
       │ 1. Connect Wallet       │                           │
       ├────────────────────────>│                           │
       │                         │ 2. Request Challenge      │
       │                         ├──────────────────────────>│
       │                         │                           │
       │                         │ 3. Nonce & Challenge      │
       │                         │<──────────────────────────┤
       │ 4. Prompt Sign          │                           │
       │<────────────────────────┤                           │
       │                         │                           │
       │ 5. Sign Transaction     │                           │
       ├────────────────────────>│                           │
       │                         │ 6. Verify Signature       │
       │                         ├──────────────────────────>│
       │                         │                           │
       │                         │ 7. Wallet Linked (200 OK) │
       │                         │<──────────────────────────┤
       │ 8. Wallet Active        │                           │
       │<────────────────────────┤                           │
```

#### Implementation Example:

```tsx
// Using the useWallet hook
import { useWallet } from 'dorisio-sdk/react';
import { signTransaction } from '@stellar/freighter-api';
import { useState } from 'react';
import { mapWalletError } from '@/hooks/use-wallet';

export function WalletLinker() {
  const { generateNonce, getChallenge, verifyWallet, loading } = useWallet();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLinkWallet = async (publicKey: string) => {
    setErrorMsg(null);
    try {
      // 1. Generate challenge nonce
      const { nonce } = await generateNonce(publicKey);

      // 2. Fetch challenge transaction envelope from server
      const challengeXdr = await getChallenge(nonce);

      // 3. User signs challenge in Freighter wallet extension
      const signedXdr = await signTransaction(challengeXdr, {
        networkPassphrase: 'Test SDF Network ; September 2015',
      });

      // 4. Submit signed envelope to verify ownership
      const wallet = await verifyWallet(publicKey, nonce, signedXdr);
      console.log('Wallet verified and linked:', wallet.publicKey);
    } catch (err: unknown) {
      setErrorMsg(mapWalletError(err));
    }
  };

  return (
    <div>
      <button disabled={loading} onClick={() => handleLinkWallet('GB...XYZ')}>
        {loading ? 'Verifying Wallet...' : 'Connect Stellar Wallet'}
      </button>
      {errorMsg && <p className="text-red-500">{errorMsg}</p>}
    </div>
  );
}
```

### Handling 401 Unauthorized & Token Refresh Loop

When an API token expires, the client must clear stored credentials and redirect to login, avoiding cascading failed requests:

```ts
import { useAuthStore } from '@/stores/auth-store';
import { updateSDKToken, getSDKClient } from '@/lib/sdk-client';
import { AuthError } from 'dorisio-sdk';

export async function executeAuthenticatedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    if (error instanceof AuthError && error.statusCode === 401) {
      // Clear token and auth store
      useAuthStore.getState().logout();
      updateSDKToken(null);

      // Redirect to login if in browser
      if (typeof window !== 'undefined') {
        window.location.href = '/login?expired=true';
      }
    }
    throw error;
  }
}
```

### Clean Logout & Credential Eviction

Always perform atomic logouts across Zustand and SDK instances:

```ts
// src/lib/auth-actions.ts
import { useAuthStore } from '@/stores/auth-store';
import { updateSDKToken, getSDKClient } from '@/lib/sdk-client';

export async function performLogout(): Promise<void> {
  const client = getSDKClient();

  try {
    // Notify backend session termination if authenticated
    if (client.getConfig().token) {
      await client.logout().catch(() => {});
    }
  } finally {
    // Clear SDK token
    updateSDKToken(null);
    // Clear Zustand store & localStorage
    useAuthStore.getState().logout();
    // Redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }
}
```

---

## 5. Error Handling Best Practices

### SDK Domain Error Hierarchy

All SDK exceptions inherit from `DorisioError`. Inspect `statusCode` and domain-specific properties:

```
DorisioError (base error)
 ├── AuthError (401 / 403 status codes)
 ├── RateLimitError (429 status code, provides retryAfter in seconds)
 ├── TimeoutError (408 status code, provides timeoutMs)
 ├── ValidationError (400 status code, provides field details map)
 ├── PaymentError (400 / 402, provides transactionHash)
 ├── WalletVerificationError (400, provides challenge and code)
 ├── NotFoundError (404 status code)
 └── NetworkError (0 / fetch failure)
```

```ts
import {
  DorisioError,
  RateLimitError,
  TimeoutError,
  AuthError,
  ValidationError,
  PaymentError,
  WalletVerificationError,
} from 'dorisio-sdk';

export function handleSDKError(error: unknown): string {
  if (error instanceof RateLimitError) {
    return `Rate limit exceeded. Please wait ${error.retryAfter} seconds.`;
  }
  if (error instanceof TimeoutError) {
    return 'The server took too long to respond. Please try again.';
  }
  if (error instanceof AuthError) {
    return 'Your session has expired. Please log in again.';
  }
  if (error instanceof ValidationError) {
    const fields = Object.entries(error.details || {})
      .map(([field, msg]) => `${field}: ${msg}`)
      .join(', ');
    return `Validation failed (${fields || error.message})`;
  }
  if (error instanceof WalletVerificationError) {
    return 'Wallet verification failed. Please re-sign the challenge.';
  }
  if (error instanceof PaymentError) {
    return `Transaction failed. Reference: ${error.transactionHash || 'N/A'}`;
  }
  if (error instanceof DorisioError) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
```

### Standard Hook Response Contract

All custom domain hooks in the frontend follow a uniform tuple shape:

```ts
export interface HookResponse<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}
```

Example usage in page components:

```tsx
export default function CreatorBalanceSection({ username }: { username: string }) {
  const { data, isLoading, isError, error } = useCreatorBalanceData(username);

  if (isLoading) return <LoadingSkeleton />;
  if (isError)
    return <AlertBanner message={error?.message || 'Failed to load balance'} variant="error" />;
  if (!data) return <EmptyState text="No balance record found" />;

  return <div>Total Earnings: ${data.totalEarnings.toLocaleString()}</div>;
}
```

### Exponential Backoff with Jitter for Transient Errors

Do not retry client validation errors (`400`, `401`, `403`, `422`). Only retry transient errors (`429`, `502`, `503`, `504`, network disconnects) using `retryWithBackoff`:

```ts
// src/lib/retry-backoff.ts
import { retryWithBackoff } from '@/lib/retry-backoff';
import { getSDKClient } from '@/lib/sdk-client';

export async function fetchCreatorResiliently(creatorId: string) {
  const client = getSDKClient();

  return retryWithBackoff(
    async () => {
      return await client.getCreator(creatorId);
    },
    {
      retries: 3, // Max 3 retries
      baseDelayMs: 200, // Initial delay 200ms
      maxDelayMs: 2000, // Max delay 2s
      factor: 2, // Exponential growth factor
      jitter: true, // Randomized jitter to avoid thundering herd
    }
  );
}
```

### User-Facing Error Message Mapping

Convert technical error codes to clear, actionable copy using `mapWalletError`:

```ts
// src/hooks/use-wallet.ts
export function mapWalletError(error: unknown): string {
  if (!error) return 'An unknown error occurred.';

  const err = error as { code?: string; message?: string };

  switch (err.code) {
    case 'CHALLENGE_EXPIRED':
      return 'Verification challenge expired. Please start the verification process again.';
    case 'INVALID_SIGNATURE':
      return 'Invalid cryptographic signature. Ensure you approve with the matching wallet.';
    case 'WALLET_ALREADY_LINKED':
      return 'This wallet is already linked to another Dorisio account.';
    case 'TIMEOUT':
      return 'The request timed out. Please try again.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a moment and try again.';
    default:
      if (err.message?.includes('Network error')) {
        return 'Network error. Please check your connection and try again.';
      }
      return err.message || 'An unexpected wallet error occurred.';
  }
}
```

### Error Monitoring & Sentry Integration

Synchronize logged-in user context with Sentry:

```ts
// src/lib/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function setMonitoringUser(user: { id: string; email?: string; username?: string } | null) {
  if (!process.env.NEXT_PUBLIC_ENABLE_ERROR_REPORTING) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}
```

---

## 6. Querying, Pagination & Batch Operations

### URL Query Builder (`buildQueryString`)

Format complex query strings with filtering, limits, offsets, and sorting:

```ts
import { buildQueryString } from 'dorisio-sdk';

const queryString = buildQueryString({
  limit: 20,
  offset: 40,
  sort: 'desc',
  filters: {
    verified: true,
    role: 'creator',
  },
});

// Result: ?limit=20&offset=40&sort=desc&filter%5Bverified%5D=true&filter%5Brole%5D=creator
```

### Cursor & Offset Pagination Utilities

The SDK provides helper functions to parse metadata and encode/decode opaque pagination cursors:

```ts
import { parsePaginationMeta, encodeCursor, decodeCursor } from 'dorisio-sdk';

// 1. Parse pagination response
const response = { total: 100, page: 2, pageSize: 20 };
const meta = parsePaginationMeta(response);
console.log(meta.hasMore); // true (40 < 100)

// 2. Cursor encoding
const cursor = encodeCursor(40); // "eyJvZmZzZXQiOjQwfQ=="
const offsetInfo = decodeCursor(cursor); // { offset: 40 }
```

### Bi-Directional Stateful Paginator (`createPaginator`)

Use `createPaginator` to navigate forward and backward without manually tracking cursors:

```ts
import { createPaginator, type QueryOptions } from 'dorisio-sdk';
import { getSDKClient } from '@/lib/sdk-client';

const client = getSDKClient();

// Create paginator instance
const tipPaginator = createPaginator(
  (options: QueryOptions) =>
    client.getTransactionHistory({
      page: options.offset ? options.offset / 10 + 1 : 1,
      pageSize: 10,
    }),
  { limit: 10 }
);

// Fetch page 1
const firstPage = await tipPaginator.next();
console.log('Page 1 items:', firstPage?.items);

// Fetch page 2
const secondPage = await tipPaginator.next();
console.log('Page 2 items:', secondPage?.items);

// Return to page 1
const backToFirst = await tipPaginator.prev();
console.log('Returned to page 1:', backToFirst?.items);
```

### Batch Processing with Partial Failure Isolation

Avoid waterfall requests and prevent one failed item from failing the entire batch:

```ts
import { getSDKClient } from '@/lib/sdk-client';

const client = getSDKClient();

// Fetch batch with concurrency control and automatic retry
const batchResult = await client.processBatchWithRetry(
  ['creator_1', 'creator_2', 'creator_3'],
  async (creatorId) => {
    return await client.getCreator(creatorId);
  },
  {
    concurrency: 3, // Max concurrent requests
    retries: 2, // Retry failed items twice
    retryDelayMs: 250, // Delay between retries
  }
);

console.log(`Successful: ${batchResult.successful.length}`);
console.log(`Failed: ${batchResult.failed.length}`);

// Access successful results
batchResult.successful.forEach(({ item, result }) => {
  console.log(`Loaded creator ${item}:`, result.name);
});

// Inspect failed items
batchResult.failed.forEach(({ item, error }) => {
  console.error(`Failed to load ${item}:`, error.message);
});
```

---

## 7. Troubleshooting Guide

### Quick Diagnostics Matrix

| Error / Symptom                         | Root Cause                                                                | Diagnosis Check                            | Recommended Fix                                                           |
| :-------------------------------------- | :------------------------------------------------------------------------ | :----------------------------------------- | :------------------------------------------------------------------------ |
| **`401 Unauthorized`**                  | JWT token expired or missing in request headers                           | Check `client.getConfig().token`           | Call `updateSDKToken(token)` upon login or redirect to `/login`           |
| **`403 Forbidden`**                     | User role does not have permission (e.g. fan accessing creator dashboard) | Check `useAuthStore.getState().user.role`  | Verify role requirement; ensure route guard redirects non-creators        |
| **`429 Too Many Requests`**             | Rate limit threshold exceeded                                             | Check `RateLimitError.retryAfter`          | Enable SDK request queue; wait `retryAfter` duration before retrying      |
| **`408 Request Timeout`**               | Network slow or Horizon Stellar node latency                              | Check network connectivity to Horizon      | Increase timeout in `ClientConfig.timeout: 45000`                         |
| **`CHALLENGE_EXPIRED`**                 | Freighter signature approval took > 5 minutes                             | Check challenge creation timestamp         | Refresh challenge nonce via `generateNonce()` and prompt sign immediately |
| **`INVALID_SIGNATURE`**                 | Selected Freighter account does not match requested public key            | Check `publicKey` passed to `verifyWallet` | Prompt user to switch Freighter account to match the target address       |
| **`ECONNREFUSED` / Network Error**      | Backend server is not running on port specified in `.env.local`           | `curl -I $NEXT_PUBLIC_API_URL/health`      | Start backend in `../backend` via `npm run dev` on port 3000              |
| **Cannot resolve module `dorisio-sdk`** | Sibling SDK directory has not been built                                  | Check `../sdk/dist/index.js`               | Run `npm run build` inside `/Users/ingenious/Desktop/Drips/sdk`           |

### Detailed Problem Solutions

#### 1. "Cannot resolve module 'dorisio-sdk' or type errors in node_modules"

- **Cause:** The project uses a local file dependency `"dorisio-sdk": "file:../sdk"`. If the SDK build artifacts (`dist/`) are missing or outdated, TypeScript and bundling will fail.
- **Fix:**
  ```bash
  cd ../sdk
  npm run build
  cd ../frontend
  npm run type-check
  ```

#### 2. "Token is set in auth store but SDK makes unauthenticated requests"

- **Cause:** The singleton `DorisioClient` was initialized before Zustand finished rehydrating tokens from `localStorage`.
- **Fix:** Always wrap auth-dependent routes with `useAuthHydration` to guarantee the token is pushed into `dorisioClient.setToken(token)` before queries execute.

#### 3. "Horizon submission timeout during peak testnet congestion"

- **Cause:** Stellar testnet Horizon nodes experience temporary ledger close delays.
- **Fix:** Wrap confirmation polling in `retryWithBackoff` with `maxDelayMs: 5000` and `retries: 5`.

---

## 8. Performance Optimization Tips

### In-Flight Request Deduplication

Enable `deduplicateRequests: true` in your client configuration. If two components request the same creator profile within a 300ms window, only one HTTP request is dispatched:

```ts
const client = new DorisioClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL!,
  deduplicateRequests: true,
  deduplicationWindow: 300,
});
```

### TanStack Server State vs. Zustand Client State

- **Zustand (`auth-store.ts`):** Store lightweight client-only states (JWT token, user profile, UI theme, modal flags).
- **TanStack Query (`@tanstack/react-query`):** Store server-backed entities (creator earnings, transaction lists, wallet balances). Configure appropriate cache times:

```ts
import { useQuery } from '@tanstack/react-query';
import { useSDKClient } from '@/lib/sdk-client';

export function useCreatorEarnings(creatorId: string) {
  const sdk = useSDKClient();

  return useQuery({
    queryKey: ['creator-earnings', creatorId],
    queryFn: () => sdk.getCreatorEarnings(creatorId),
    staleTime: 60 * 1000, // Keep fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Garbage collect after 5 minutes
    refetchOnWindowFocus: false,
  });
}
```

### Parallel Batch Queries vs. Waterfall Requests

❌ **Avoid Waterfalls:**

```ts
// Anti-pattern: Sequential waterfall
const creator = await sdk.getCreator(creatorId);
const balance = await sdk.getCreatorEarnings(creatorId);
const history = await sdk.getTransactionHistory({ page: 1 });
```

✅ **Execute Concurrently:**

```ts
// Optimized: Parallel resolution
const [creator, balance, history] = await Promise.all([
  sdk.getCreator(creatorId),
  sdk.getCreatorEarnings(creatorId),
  sdk.getTransactionHistory({ page: 1 }),
]);
```

### Optimistic UI Updates for Tip Creation

When a user submits a tip, optimistically update UI balances before blockchain confirmation completes:

```tsx
const queryClient = useQueryClient();

const tipMutation = useMutation({
  mutationFn: (newTip: CreateTipRequest) => sdk.createTip(newTip),
  onMutate: async (newTip) => {
    // Snapshot previous value
    await queryClient.cancelQueries({ queryKey: ['creator-balance', creatorId] });
    const previousBalance = queryClient.getQueryData(['creator-balance', creatorId]);

    // Optimistically update cache
    queryClient.setQueryData(['creator-balance', creatorId], (old: any) => ({
      ...old,
      totalEarnings: (old?.totalEarnings || 0) + newTip.amount,
    }));

    return { previousBalance };
  },
  onError: (err, newTip, context) => {
    // Rollback on failure
    queryClient.setQueryData(['creator-balance', creatorId], context?.previousBalance);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['creator-balance', creatorId] });
  },
});
```

### Tree-Shaking & Bundle Splitting

Import directly from submodules where appropriate to minimize initial client bundle size:

- Use `dorisio-sdk/react` for React hooks and components.
- Use dynamic imports (`next/dynamic`) for heavy cryptographic / wallet components (`Freighter` signer) so they are only loaded when users click "Connect Wallet".

```tsx
import dynamic from 'next/dynamic';

const WalletManagerModal = dynamic(
  () => import('@/components/sections/wallet-manager').then((mod) => mod.WalletManager),
  { ssr: false, loading: () => <p>Loading wallet tools...</p> }
);
```

---

## 9. Code Verification & Test Suite

All code patterns, configurations, error behaviors, and utilities documented in this guide are covered by automated unit tests in `src/lib/sdk-usage-examples.test.ts`.

To run the verification suite:

```bash
# Run all verified SDK usage patterns
npx vitest run src/lib/sdk-usage-examples.test.ts

# Run with coverage report
npx vitest run src/lib/sdk-usage-examples.test.ts --coverage
```
