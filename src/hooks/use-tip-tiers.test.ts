import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTipTiers } from './use-tip-tiers';
import { useTipTierStore, DEFAULT_TIP_TIERS } from '@/stores/tip-tier-store';

describe('useTipTiers', () => {
  beforeEach(() => {
    useTipTierStore.setState({
      tiersByCreator: {},
      recentCustomAmounts: [],
      recentCustomAmountsByCreator: {},
    });
  });

  it('initializes with default tiers sorted low to high', () => {
    const { result } = renderHook(() => useTipTiers('creator-1'));

    expect(result.current.tiers).toEqual(DEFAULT_TIP_TIERS);
    expect(result.current.tiers).toEqual([1, 5, 10, 25]);
    expect(result.current.recentCustomAmounts).toEqual([]);
  });

  it('uses initialTiers prop if provided when store has no tiers', () => {
    const { result } = renderHook(() => useTipTiers('creator-1', [50, 10, 5, 2]));

    expect(result.current.tiers).toEqual([2, 5, 10, 50]);
  });

  it('adds a new tier and sorts ascending', () => {
    const { result } = renderHook(() => useTipTiers('creator-1'));

    act(() => {
      result.current.addTier(3);
    });

    expect(result.current.tiers).toEqual([1, 3, 5, 10, 25]);
  });

  it('does not add duplicate tiers', () => {
    const { result } = renderHook(() => useTipTiers('creator-1'));

    act(() => {
      result.current.addTier(5);
    });

    expect(result.current.tiers).toEqual([1, 5, 10, 25]);
  });

  it('removes an existing tier', () => {
    const { result } = renderHook(() => useTipTiers('creator-1'));

    act(() => {
      result.current.removeTier(10);
    });

    expect(result.current.tiers).toEqual([1, 5, 25]);
  });

  it('resets tiers to default', () => {
    const { result } = renderHook(() => useTipTiers('creator-1'));

    act(() => {
      result.current.setTiers([20, 40]);
    });
    expect(result.current.tiers).toEqual([20, 40]);

    act(() => {
      result.current.resetTiers();
    });
    expect(result.current.tiers).toEqual(DEFAULT_TIP_TIERS);
  });

  it('tracks recent custom amounts up to 3', () => {
    const { result } = renderHook(() => useTipTiers('creator-1'));

    act(() => {
      result.current.addRecentCustomAmount(7);
      result.current.addRecentCustomAmount(14);
      result.current.addRecentCustomAmount(21);
      result.current.addRecentCustomAmount(28);
    });

    expect(result.current.recentCustomAmounts).toEqual([28, 21, 14]);
  });
});
