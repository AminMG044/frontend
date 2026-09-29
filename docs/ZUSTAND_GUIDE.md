# Zustand State Management Guide

This guide describes how to organize client state in the Dorisio frontend. It uses the patterns already present in `src/stores` and distinguishes Zustand state from remote server data.

## Choose the State Owner

Use the narrowest owner that matches the data's lifetime and source of truth:

| State                                                  | Preferred owner             | Example                                       |
| ------------------------------------------------------ | --------------------------- | --------------------------------------------- |
| Server-owned data, request caching, refetching         | SDK hooks or TanStack Query | Creator analytics and transaction history     |
| Shared client domain state used by multiple components | A feature store             | Tip tiers, scheduled tips, wallet preferences |
| App-wide transient UI state                            | `useAppStore`               | Toast notifications and sidebar state         |
| Local form input or one component's open/closed state  | React `useState`            | A dialog's draft values                       |

Do not copy API responses into Zustand just to make them globally accessible. Keep remote data in its query/SDK owner so loading, errors, invalidation, and refetching have one source of truth. Add Zustand when multiple parts of the client need to coordinate state that the server does not own.

## Organize a Store

Keep a store focused on one domain. Put its state shape, actions, and invariants together; keep UI rendering in components and network/data-access concerns in SDK hooks or service functions.

```text
src/stores/
  auth-store.ts                         # session state and auth transitions
  tip-tier-store.ts                     # creator tip presets and recent amounts
  scheduled-tips-store.ts               # schedule lifecycle and actions
  wallet-preference-store.ts            # wallet selection preferences
  scheduled-tips-store.test.ts          # behavior tests next to the store
```

Use a typed state interface and define actions alongside the fields they update. The existing tip-tier store is a representative persisted store:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TipTierStore {
  tiersByCreator: Record<string, number[]>;
  setTipTiers: (creatorId: string, tiers: number[]) => void;
  resetTipTiers: (creatorId: string) => void;
}

export const useTipTierStore = create<TipTierStore>()(
  persist(
    (set) => ({
      tiersByCreator: {},
      setTipTiers: (creatorId, tiers) => {
        const cleanTiers = Array.from(
          new Set(tiers.filter((tier) => Number.isFinite(tier) && tier > 0))
        ).sort((a, b) => a - b);

        set((state) => ({
          tiersByCreator: { ...state.tiersByCreator, [creatorId]: cleanTiers },
        }));
      },
      resetTipTiers: (creatorId) => {
        set((state) => {
          const tiersByCreator = { ...state.tiersByCreator };
          delete tiersByCreator[creatorId];
          return { tiersByCreator };
        });
      },
    }),
    { name: 'dorisio-tip-tier-storage' }
  )
);
```

This is an abbreviated version of [`tip-tier-store.ts`](../src/stores/tip-tier-store.ts). Update state immutably, validate input at the action boundary, and scope per-creator or per-user data with a keyed record instead of creating one store per entity. Use `get()` only when an action needs the latest state to compute its result.

Export public stores and useful types from [`stores/index.ts`](../src/stores/index.ts) when consumers need a central import. Keep implementation helpers private unless another module genuinely needs them.

## Selectors and Renders

Zustand's React hook subscribes to the value returned by its selector. Select only what the component uses:

```tsx
import { useAuthStore } from '@/stores/auth-store';

const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
```

Selecting an action is also narrow and keeps the component independent of unrelated state updates:

```tsx
import { useScheduledTipsStore } from '@/stores/scheduled-tips-store';

const scheduleTip = useScheduledTipsStore((state) => state.scheduleTip);
```

Avoid subscribing to the entire store when a component needs only one field:

```tsx
import { useAuthStore } from '@/stores/auth-store';

// Broad subscription: any auth-store update can re-render this component.
const { user, isAuthenticated } = useAuthStore();

// Prefer selectors for the fields this component renders.
const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
```

When returning a new object or array from a selector, its identity changes on every evaluation. With this repo's Zustand 4 dependency, pass `shallow` when the selected object's fields are the relevant equality boundary:

```tsx
import { useAuthStore } from '@/stores/auth-store';
import { shallow } from 'zustand/shallow';

const { user, isAuthenticated } = useAuthStore(
  (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
  shallow
);
```

Do not use `shallow` automatically. Prefer separate primitive/reference selectors for simple cases, and derive expensive view data at the component or hook boundary. Keep selectors pure; do not perform I/O, mutate state, or allocate large transformed collections inside them.

Use `store.getState()` for imperative work outside React, such as an event handler or a test. Components that need reactive updates should use the hook selector, not `getState()` during render.

## Persistence and Hydration

Persist only serializable client state that should survive reloads. Give each persisted store a stable, unique key, and consider `partialize` when only part of a store should be written:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PushNotificationPreferenceStore {
  optedIn: boolean;
  setOptedIn: (optedIn: boolean) => void;
}

export const usePushNotificationPreferenceStore = create<PushNotificationPreferenceStore>()(
  persist(
    (set) => ({
      optedIn: false,
      setOptedIn: (optedIn) => set({ optedIn }),
    }),
    { name: 'Dorisio-push-notification-preference' }
  )
);
```

The preference store in [`push-notification-preference-store.ts`](../src/stores/push-notification-preference-store.ts) is the small-state example. For changing persisted schemas, use Zustand's `version` and `migrate` options and test both current and older stored shapes. Do not persist derived data, transient request state, or server-owned caches.

Persisted state is not available until rehydration completes. Auth-dependent UI should use the existing `hasHydrated` guard rather than treating the initial `null` user as a confirmed signed-out state; see [`use-auth-hydration.ts`](../src/hooks/use-auth-hydration.ts) and [`auth-store.ts`](../src/stores/auth-store.ts).

The current auth store persists a token so it can restore the SDK client. This is an existing security-sensitive tradeoff, not a general persistence example. Do not add credentials or secrets to localStorage-backed stores without an explicit security review.

## Actions and Async Work

Keep a state transition in an action when it is part of the store's domain. Make the action's return type explicit when callers need to distinguish success, failure, or a result. A real, tested async action in this repo is scheduled-tip execution:

```ts
import { useScheduledTipsStore } from '@/stores/scheduled-tips-store';

const tip = useScheduledTipsStore.getState().scheduleTip({
  creatorId: 'creator-1',
  amount: 10,
  scheduledDate: new Date('2026-10-01T12:00:00Z'),
  frequency: 'once',
});

const executed = await useScheduledTipsStore.getState().executeScheduledTip(tip.id);
if (!executed) {
  // The tip may no longer be pending or may not exist.
}
```

In a React component, select the action rather than reading the store imperatively:

```tsx
import { useState } from 'react';
import { useScheduledTipsStore } from '@/stores/scheduled-tips-store';

function ExecuteScheduledTipButton({ id }: { id: string }): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const executeScheduledTip = useScheduledTipsStore((state) => state.executeScheduledTip);

  async function handleExecute(): Promise<void> {
    const succeeded = await executeScheduledTip(id);
    if (!succeeded) setError('This scheduled tip is no longer pending.');
  }

  return (
    <div>
      <button type="button" onClick={() => void handleExecute()}>
        Execute scheduled tip
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

For an action that calls a remote service, represent `idle/loading/success/error` explicitly when the UI needs those states, clear stale errors when retrying, and catch failures into a predictable result or error field. Keep request caching, deduplication, and invalidation in TanStack Query or the SDK when the data is server-owned. For long-running or overlapping requests, use cancellation or request IDs so an old response cannot overwrite newer state. Never report success before the underlying operation succeeds.

Use one action per meaningful transition (`schedule`, `edit`, `cancel`, `execute`) rather than exposing generic setters that allow invalid combinations. The scheduled-tip lifecycle and recurring behavior are covered in [`scheduled-tips-store.test.ts`](../src/stores/scheduled-tips-store.test.ts).

## Debugging

Start with the smallest useful inspection:

```ts
import { useTipTierStore } from '@/stores/tip-tier-store';

// Current snapshot; useful in tests and one-off imperative code.
console.debug(useTipTierStore.getState());

// Temporary subscription; always unsubscribe after investigating.
const unsubscribe = useTipTierStore.subscribe((state, previousState) => {
  console.debug({ state, previousState });
});
```

For action history and time travel, wrap a store in Zustand's `devtools` middleware during development:

```ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface ExampleStore {
  value: number;
  increment: () => void;
}

export const useExampleStore = create<ExampleStore>()(
  devtools((set) => ({ value: 0, increment: () => set((state) => ({ value: state.value + 1 })) }), {
    name: 'example-store',
    enabled: process.env.NODE_ENV === 'development',
  })
);
```

Give each store a useful DevTools name, do not attach secrets to action labels or debug output, and remove temporary subscriptions/logging after diagnosis. If renders are unexpectedly frequent, inspect the selector first, then use React DevTools Profiler to verify the component's render path. For persistence bugs, inspect the store's named localStorage key and test hydration from a representative saved value.

## Migration Checklist

Move complex state incrementally; avoid rewriting a whole feature at once:

1. Inventory the current state, its owner, consumers, and whether it is server-owned or client-owned.
2. Keep local drafts and one-component UI state in React. Keep API data in its SDK/query owner. Move only shared client state into a feature store.
3. Define the state interface, valid transitions, persistence requirements, and store key before migrating consumers.
4. Implement actions and selectors, then migrate one consumer at a time. Avoid maintaining old and new writable copies in parallel.
5. Add tests for initialization, each transition, invalid input, persistence/hydration, and async success/failure paths that apply.
6. Remove the old Context/provider or duplicate state only after all consumers use the store and tests pass.
7. For persisted schema changes, add a versioned migration and test data written by the previous version.

## Real-World References and Tests

| Scenario                                 | Implementation                                                                                 | Tests                                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Persisted auth and hydration             | [`auth-store.ts`](../src/stores/auth-store.ts)                                                 | [`auth-store.test.ts`](../src/stores/auth-store.test.ts)                                                 |
| Small persisted preferences              | [`push-notification-preference-store.ts`](../src/stores/push-notification-preference-store.ts) | [`push-notification-preference-store.test.ts`](../src/stores/push-notification-preference-store.test.ts) |
| Normalized per-creator preferences       | [`tip-tier-store.ts`](../src/stores/tip-tier-store.ts)                                         | [`tip-tier-store.test.ts`](../src/stores/tip-tier-store.test.ts)                                         |
| Async lifecycle and recurring work       | [`scheduled-tips-store.ts`](../src/stores/scheduled-tips-store.ts)                             | [`scheduled-tips-store.test.ts`](../src/stores/scheduled-tips-store.test.ts)                             |
| Thin UI hook with selected state/actions | [`use-scheduled-tips.ts`](../src/hooks/use-scheduled-tips.ts)                                  | Exercises the store actions above                                                                        |
| Transient app notifications              | [`app-store.ts`](../src/stores/app-store.ts)                                                   | Consumer behavior is tested with notification features                                                   |

Run the focused examples with:

```bash
npm run test:run -- \
  src/stores/auth-store.test.ts \
  src/stores/push-notification-preference-store.test.ts \
  src/stores/tip-tier-store.test.ts \
  src/stores/scheduled-tips-store.test.ts
```

The same tests verify the store behavior demonstrated in this guide; update those tests whenever the corresponding store contract changes.
