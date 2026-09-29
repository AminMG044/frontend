import { describe, it, expect, beforeEach } from 'vitest';
import { useTipTierStore, DEFAULT_TIP_TIERS, MAX_RECENT_CUSTOM_AMOUNTS } from './tip-tier-store';

describe('useTipTierStore', () => {
  beforeEach(() => {
    useTipTierStore.setState({
      tiersByCreator: {},
      recentCustomAmounts: [],
      recentCustomAmountsByCreator: {},
    });
  });

  describe('getTipTiers and setTipTiers', () => {
    it('returns default tiers when no creator tiers are set', () => {
      const tiers = useTipTierStore.getState().getTipTiers('creator-1');
      expect(tiers).toEqual(DEFAULT_TIP_TIERS);
      expect(tiers).toEqual([1, 5, 10, 25]);
    });

    it('falls back to initialTiers sorted low to high when provided', () => {
      const tiers = useTipTierStore.getState().getTipTiers('creator-1', [20, 5, 50, 2]);
      expect(tiers).toEqual([2, 5, 20, 50]);
    });

    it('stores and retrieves custom tiers per creator sorted low to high', () => {
      useTipTierStore.getState().setTipTiers('creator-1', [15, 3, 50, 10]);
      useTipTierStore.getState().setTipTiers('creator-2', [100, 25, 50]);

      expect(useTipTierStore.getState().getTipTiers('creator-1')).toEqual([3, 10, 15, 50]);
      expect(useTipTierStore.getState().getTipTiers('creator-2')).toEqual([25, 50, 100]);
    });

    it('deduplicates and filters out non-positive or invalid amounts', () => {
      useTipTierStore.getState().setTipTiers('creator-1', [5, 0, -10, 5, 25, NaN, 10]);
      expect(useTipTierStore.getState().getTipTiers('creator-1')).toEqual([5, 10, 25]);
    });

    it('resets custom tiers back to default', () => {
      useTipTierStore.getState().setTipTiers('creator-1', [2, 4, 6]);
      expect(useTipTierStore.getState().getTipTiers('creator-1')).toEqual([2, 4, 6]);

      useTipTierStore.getState().resetTipTiers('creator-1');
      expect(useTipTierStore.getState().getTipTiers('creator-1')).toEqual(DEFAULT_TIP_TIERS);
    });
  });

  describe('recent custom amounts', () => {
    it('stores up to MAX_RECENT_CUSTOM_AMOUNTS (3) custom amounts', () => {
      const { addRecentCustomAmount, getRecentCustomAmounts } = useTipTierStore.getState();

      addRecentCustomAmount(7);
      addRecentCustomAmount(12);
      addRecentCustomAmount(18);
      addRecentCustomAmount(22);

      const recent = getRecentCustomAmounts();
      expect(recent).toHaveLength(MAX_RECENT_CUSTOM_AMOUNTS);
      expect(recent).toEqual([22, 18, 12]);
    });

    it('moves existing amount to the front if reused', () => {
      const { addRecentCustomAmount, getRecentCustomAmounts } = useTipTierStore.getState();

      addRecentCustomAmount(10);
      addRecentCustomAmount(20);
      addRecentCustomAmount(30);
      addRecentCustomAmount(10);

      expect(getRecentCustomAmounts()).toEqual([10, 30, 20]);
    });

    it('tracks recent custom amounts per creator while syncing to global', () => {
      const { addRecentCustomAmount, getRecentCustomAmounts } = useTipTierStore.getState();

      addRecentCustomAmount(15, 'creator-1');
      addRecentCustomAmount(45, 'creator-2');

      expect(getRecentCustomAmounts('creator-1')).toEqual([15]);
      expect(getRecentCustomAmounts('creator-2')).toEqual([45]);
      expect(getRecentCustomAmounts()).toEqual([45, 15]);
    });

    it('ignores zero or negative custom amounts', () => {
      const { addRecentCustomAmount, getRecentCustomAmounts } = useTipTierStore.getState();

      addRecentCustomAmount(0);
      addRecentCustomAmount(-5);
      expect(getRecentCustomAmounts()).toEqual([]);
    });

    it('clears recent custom amounts', () => {
      const { addRecentCustomAmount, clearRecentCustomAmounts, getRecentCustomAmounts } =
        useTipTierStore.getState();

      addRecentCustomAmount(15, 'creator-1');
      clearRecentCustomAmounts('creator-1');
      expect(getRecentCustomAmounts('creator-1')).toEqual([15]); // falls back to global

      clearRecentCustomAmounts();
      expect(getRecentCustomAmounts()).toEqual([]);
    });
  });
});
