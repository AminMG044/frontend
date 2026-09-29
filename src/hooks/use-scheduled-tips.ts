'use client';

/**
 * Hook for managing scheduled and recurring tips
 */

import { useMemo, useCallback } from 'react';
import {
  useScheduledTipsStore,
  ScheduleTipPayload,
  EditScheduledTipPayload,
} from '@/stores/scheduled-tips-store';
import { ScheduledTip } from '@/types';

export interface UseScheduledTipsResult {
  scheduledTips: ScheduledTip[];
  pendingTips: ScheduledTip[];
  scheduleTip: (payload: ScheduleTipPayload) => ScheduledTip;
  editScheduledTip: (id: string, updates: EditScheduledTipPayload) => boolean;
  cancelScheduledTip: (id: string) => boolean;
  executeScheduledTip: (id: string) => Promise<boolean>;
  checkAndExecuteDueTips: () => Promise<ScheduledTip[]>;
}

export function useScheduledTips(creatorId?: string): UseScheduledTipsResult {
  const allTips = useScheduledTipsStore((state) => state.scheduledTips);
  const scheduleTipStore = useScheduledTipsStore((state) => state.scheduleTip);
  const editTipStore = useScheduledTipsStore((state) => state.editScheduledTip);
  const cancelTipStore = useScheduledTipsStore((state) => state.cancelScheduledTip);
  const executeTipStore = useScheduledTipsStore((state) => state.executeScheduledTip);
  const checkDueStore = useScheduledTipsStore((state) => state.checkAndExecuteDueTips);

  const scheduledTips = useMemo<ScheduledTip[]>(() => {
    if (!creatorId) return allTips;
    return allTips.filter((t) => t.creatorId === creatorId);
  }, [allTips, creatorId]);

  const pendingTips = useMemo<ScheduledTip[]>(() => {
    return scheduledTips
      .filter((t) => t.status === 'pending')
      .sort(
        (a, b) =>
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
  }, [scheduledTips]);

  const scheduleTip = useCallback(
    (payload: ScheduleTipPayload): ScheduledTip => {
      return scheduleTipStore(payload);
    },
    [scheduleTipStore]
  );

  const editScheduledTip = useCallback(
    (id: string, updates: EditScheduledTipPayload): boolean => {
      return editTipStore(id, updates);
    },
    [editTipStore]
  );

  const cancelScheduledTip = useCallback(
    (id: string): boolean => {
      return cancelTipStore(id);
    },
    [cancelTipStore]
  );

  const executeScheduledTip = useCallback(
    async (id: string): Promise<boolean> => {
      return executeTipStore(id);
    },
    [executeTipStore]
  );

  const checkAndExecuteDueTips = useCallback(async (): Promise<ScheduledTip[]> => {
    return checkDueStore();
  }, [checkDueStore]);

  return {
    scheduledTips,
    pendingTips,
    scheduleTip,
    editScheduledTip,
    cancelScheduledTip,
    executeScheduledTip,
    checkAndExecuteDueTips,
  };
}
