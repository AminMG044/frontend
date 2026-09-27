import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScheduledTips } from './use-scheduled-tips';
import { useScheduledTipsStore } from '@/stores/scheduled-tips-store';

describe('useScheduledTips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScheduledTipsStore.setState({
      scheduledTips: [],
    });
  });

  it('schedules tip and retrieves pending tips for a creator', () => {
    const { result } = renderHook(() => useScheduledTips('creator-1'));

    expect(result.current.pendingTips).toEqual([]);

    act(() => {
      result.current.scheduleTip({
        creatorId: 'creator-1',
        amount: 25,
        scheduledDate: new Date('2026-11-20T12:00:00Z'),
        frequency: 'weekly',
      });
    });

    expect(result.current.pendingTips).toHaveLength(1);
    expect(result.current.pendingTips[0].amount).toBe(25);
    expect(result.current.pendingTips[0].frequency).toBe('weekly');
  });

  it('filters pending tips by creatorId', () => {
    const { result: hook1 } = renderHook(() => useScheduledTips('creator-1'));
    const { result: hook2 } = renderHook(() => useScheduledTips('creator-2'));

    act(() => {
      hook1.current.scheduleTip({
        creatorId: 'creator-1',
        amount: 10,
        scheduledDate: new Date('2026-11-20T12:00:00Z'),
      });
      hook2.current.scheduleTip({
        creatorId: 'creator-2',
        amount: 20,
        scheduledDate: new Date('2026-11-22T12:00:00Z'),
      });
    });

    expect(hook1.current.pendingTips).toHaveLength(1);
    expect(hook1.current.pendingTips[0].amount).toBe(10);

    expect(hook2.current.pendingTips).toHaveLength(1);
    expect(hook2.current.pendingTips[0].amount).toBe(20);
  });

  it('edits a scheduled tip', () => {
    const { result } = renderHook(() => useScheduledTips('creator-1'));

    let tipId = '';
    act(() => {
      const tip = result.current.scheduleTip({
        creatorId: 'creator-1',
        amount: 15,
        scheduledDate: new Date('2026-12-01T12:00:00Z'),
      });
      tipId = tip.id;
    });

    act(() => {
      result.current.editScheduledTip(tipId, {
        amount: 30,
        message: 'Updated message',
      });
    });

    expect(result.current.pendingTips[0].amount).toBe(30);
    expect(result.current.pendingTips[0].message).toBe('Updated message');
  });

  it('cancels a scheduled tip', () => {
    const { result } = renderHook(() => useScheduledTips('creator-1'));

    let tipId = '';
    act(() => {
      const tip = result.current.scheduleTip({
        creatorId: 'creator-1',
        amount: 15,
        scheduledDate: new Date('2026-12-01T12:00:00Z'),
      });
      tipId = tip.id;
    });

    expect(result.current.pendingTips).toHaveLength(1);

    act(() => {
      result.current.cancelScheduledTip(tipId);
    });

    expect(result.current.pendingTips).toHaveLength(0);
    expect(result.current.scheduledTips[0].status).toBe('cancelled');
  });
});
