'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_BADGE_THRESHOLDS,
  getCreatorBadgeThresholds,
  normalizeThresholds,
  saveCreatorBadgeThresholds,
} from '@/lib/loyalty';
import type { BadgeThresholds } from '@/types/loyalty';

export interface UseCreatorBadgeThresholdsResult {
  thresholds: BadgeThresholds;
  saveThresholds: (next: Partial<BadgeThresholds>) => BadgeThresholds;
  resetThresholds: () => BadgeThresholds;
}

/**
 * Read and persist the badge thresholds a creator has configured.
 * Thresholds are normalized on every write so tiers always stay ascending.
 */
export function useCreatorBadgeThresholds(
  creatorId: string | null | undefined
): UseCreatorBadgeThresholdsResult {
  const [thresholds, setThresholds] = useState<BadgeThresholds>(DEFAULT_BADGE_THRESHOLDS);

  useEffect(() => {
    setThresholds(getCreatorBadgeThresholds(creatorId));
  }, [creatorId]);

  const saveThresholds = useCallback(
    (next: Partial<BadgeThresholds>): BadgeThresholds => {
      if (!creatorId) return normalizeThresholds(next);
      const saved = saveCreatorBadgeThresholds(creatorId, next);
      setThresholds(saved);
      return saved;
    },
    [creatorId]
  );

  const resetThresholds = useCallback(
    (): BadgeThresholds => saveThresholds(DEFAULT_BADGE_THRESHOLDS),
    [saveThresholds]
  );

  return { thresholds, saveThresholds, resetThresholds };
}
