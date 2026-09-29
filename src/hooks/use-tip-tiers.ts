'use client';

/**
 * Hook for managing creator tip tiers and recent custom amounts
 */

import { useMemo, useCallback } from 'react';
import { useTipTierStore, DEFAULT_TIP_TIERS } from '@/stores/tip-tier-store';

export interface UseTipTiersResult {
  /** Configured preset tiers sorted low to high */
  tiers: number[];
  /** Set all tiers for this creator (sorted ascending) */
  setTiers: (tiers: number[]) => void;
  /** Add a single tier amount */
  addTier: (amount: number) => void;
  /** Remove a single tier amount */
  removeTier: (amount: number) => void;
  /** Reset creator tiers to default tiers */
  resetTiers: () => void;
  /** Recent custom amounts used (last 3) */
  recentCustomAmounts: number[];
  /** Remember a custom amount */
  addRecentCustomAmount: (amount: number) => void;
  /** Clear remembered custom amounts */
  clearRecentCustomAmounts: () => void;
}

export function useTipTiers(creatorId: string, initialTiers?: number[]): UseTipTiersResult {
  const customTiers = useTipTierStore((state) => state.tiersByCreator[creatorId]);
  const creatorRecent = useTipTierStore(
    (state) => state.recentCustomAmountsByCreator[creatorId]
  );
  const globalRecent = useTipTierStore((state) => state.recentCustomAmounts);
  const setStoreTiers = useTipTierStore((state) => state.setTipTiers);
  const resetStoreTiers = useTipTierStore((state) => state.resetTipTiers);
  const addStoreRecent = useTipTierStore((state) => state.addRecentCustomAmount);
  const clearStoreRecent = useTipTierStore((state) => state.clearRecentCustomAmounts);

  const tiers = useMemo<number[]>(() => {
    if (customTiers && customTiers.length > 0) {
      return [...customTiers].sort((a, b) => a - b);
    }
    if (initialTiers && initialTiers.length > 0) {
      return [...initialTiers]
        .filter((t) => typeof t === 'number' && Number.isFinite(t) && t > 0)
        .sort((a, b) => a - b);
    }
    return [...DEFAULT_TIP_TIERS];
  }, [customTiers, initialTiers]);

  const recentCustomAmounts = useMemo<number[]>(() => {
    if (creatorRecent && creatorRecent.length > 0) {
      return creatorRecent;
    }
    return globalRecent || [];
  }, [creatorRecent, globalRecent]);

  const setTiers = useCallback(
    (newTiers: number[]): void => {
      setStoreTiers(creatorId, newTiers);
    },
    [creatorId, setStoreTiers]
  );

  const addTier = useCallback(
    (amount: number): void => {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return;
      if (tiers.includes(amount)) return;
      const nextTiers = [...tiers, amount];
      setStoreTiers(creatorId, nextTiers);
    },
    [creatorId, tiers, setStoreTiers]
  );

  const removeTier = useCallback(
    (amount: number): void => {
      const nextTiers = tiers.filter((t) => t !== amount);
      setStoreTiers(creatorId, nextTiers);
    },
    [creatorId, tiers, setStoreTiers]
  );

  const resetTiers = useCallback((): void => {
    resetStoreTiers(creatorId);
  }, [creatorId, resetStoreTiers]);

  const addRecentCustomAmount = useCallback(
    (amount: number): void => {
      addStoreRecent(amount, creatorId);
    },
    [creatorId, addStoreRecent]
  );

  const clearRecentCustomAmounts = useCallback((): void => {
    clearStoreRecent(creatorId);
  }, [creatorId, clearStoreRecent]);

  return {
    tiers,
    setTiers,
    addTier,
    removeTier,
    resetTiers,
    recentCustomAmounts,
    addRecentCustomAmount,
    clearRecentCustomAmounts,
  };
}
