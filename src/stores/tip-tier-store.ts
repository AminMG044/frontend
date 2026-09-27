/**
 * Tip Tier Store
 * Manages creator tip preset tiers and remembers recent custom tip amounts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_TIP_TIERS: number[] = [1, 5, 10, 25];
export const MAX_RECENT_CUSTOM_AMOUNTS = 3;

export interface TipTierStore {
  /** Configured preset tip tiers per creator, keyed by creatorId. */
  tiersByCreator: Record<string, number[]>;
  /** Global last 3 used custom tip amounts. */
  recentCustomAmounts: number[];
  /** Per-creator last 3 used custom tip amounts, keyed by creatorId. */
  recentCustomAmountsByCreator: Record<string, number[]>;

  /** Get sorted (low to high) preset tiers for a creator. Falls back to optional initialTiers or DEFAULT_TIP_TIERS. */
  getTipTiers: (creatorId: string, initialTiers?: number[]) => number[];
  /** Set preset tiers for a creator. Automatically filters positive numbers and sorts ascending. */
  setTipTiers: (creatorId: string, tiers: number[]) => void;
  /** Reset preset tiers for a creator to DEFAULT_TIP_TIERS. */
  resetTipTiers: (creatorId: string) => void;

  /** Add a recent custom amount (remembered in both global and per-creator lists, up to 3). */
  addRecentCustomAmount: (amount: number, creatorId?: string) => void;
  /** Get recent custom amounts (last 3 used) for a creator, falling back to global recent amounts. */
  getRecentCustomAmounts: (creatorId?: string) => number[];
  /** Clear recent custom amounts. */
  clearRecentCustomAmounts: (creatorId?: string) => void;
}

export const useTipTierStore = create<TipTierStore>()(
  persist(
    (set, get) => ({
      tiersByCreator: {},
      recentCustomAmounts: [],
      recentCustomAmountsByCreator: {},

      getTipTiers: (creatorId: string, initialTiers?: number[]): number[] => {
        const state = get();
        const customTiers = state.tiersByCreator[creatorId];
        if (customTiers && customTiers.length > 0) {
          return [...customTiers].sort((a, b) => a - b);
        }
        if (initialTiers && initialTiers.length > 0) {
          return [...initialTiers]
            .filter((t) => typeof t === 'number' && Number.isFinite(t) && t > 0)
            .sort((a, b) => a - b);
        }
        return [...DEFAULT_TIP_TIERS];
      },

      setTipTiers: (creatorId: string, tiers: number[]): void => {
        const cleanTiers = Array.from(
          new Set(
            tiers.filter((t) => typeof t === 'number' && Number.isFinite(t) && t > 0)
          )
        ).sort((a, b) => a - b);

        set((state) => ({
          tiersByCreator: {
            ...state.tiersByCreator,
            [creatorId]: cleanTiers,
          },
        }));
      },

      resetTipTiers: (creatorId: string): void => {
        set((state) => {
          const next = { ...state.tiersByCreator };
          delete next[creatorId];
          return { tiersByCreator: next };
        });
      },

      addRecentCustomAmount: (amount: number, creatorId?: string): void => {
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
          return;
        }

        set((state) => {
          const globalFiltered = state.recentCustomAmounts.filter((a) => a !== amount);
          const nextGlobal = [amount, ...globalFiltered].slice(0, MAX_RECENT_CUSTOM_AMOUNTS);

          if (!creatorId) {
            return { recentCustomAmounts: nextGlobal };
          }

          const existingCreator = state.recentCustomAmountsByCreator[creatorId] || [];
          const creatorFiltered = existingCreator.filter((a) => a !== amount);
          const nextCreator = [amount, ...creatorFiltered].slice(0, MAX_RECENT_CUSTOM_AMOUNTS);

          return {
            recentCustomAmounts: nextGlobal,
            recentCustomAmountsByCreator: {
              ...state.recentCustomAmountsByCreator,
              [creatorId]: nextCreator,
            },
          };
        });
      },

      getRecentCustomAmounts: (creatorId?: string): number[] => {
        const state = get();
        if (creatorId && state.recentCustomAmountsByCreator[creatorId]?.length) {
          return state.recentCustomAmountsByCreator[creatorId];
        }
        return state.recentCustomAmounts;
      },

      clearRecentCustomAmounts: (creatorId?: string): void => {
        set((state) => {
          if (!creatorId) {
            return {
              recentCustomAmounts: [],
              recentCustomAmountsByCreator: {},
            };
          }

          const next = { ...state.recentCustomAmountsByCreator };
          delete next[creatorId];
          return { recentCustomAmountsByCreator: next };
        });
      },
    }),
    {
      name: 'dorisio-tip-tier-storage',
    }
  )
);
