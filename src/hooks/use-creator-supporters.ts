'use client';

import { useEffect, useState } from 'react';
import { fetchCreatorAnalytics } from '@/hooks/use-creator-analytics';
import type { AnalyticsDateRangePreset } from '@/types';
import type { SupporterLeaderboardEntry } from '@/types/loyalty';

export interface UseCreatorSupportersResult {
  entries: SupporterLeaderboardEntry[];
  loading: boolean;
}

/**
 * Load a creator's public top supporters for the on-profile leaderboard.
 *
 * Reuses the public analytics endpoint (which already aggregates a creator's
 * top tippers) since the SDK exposes no dedicated supporters endpoint. Fails
 * soft: a network/API error yields an empty list so the profile still renders.
 */
export function useCreatorSupporters(
  username: string | null | undefined,
  preset: AnalyticsDateRangePreset = '30d'
): UseCreatorSupportersResult {
  const [entries, setEntries] = useState<SupporterLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username) {
      setEntries([]);
      return;
    }

    let active = true;
    setLoading(true);

    fetchCreatorAnalytics(username, { preset })
      .then((analytics) => {
        if (!active) return;
        setEntries(
          analytics.topTippers.map((tipper) => ({
            id: tipper.id,
            name: tipper.name,
            totalAmount: tipper.totalAmount,
            tipCount: tipper.tipCount,
          }))
        );
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [username, preset]);

  return { entries, loading };
}
