/**
 * useActivityFeed Hook
 * Fetches and manages activity feed data with pagination and filtering
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ActivityFeedItem, ActivityFeedFilters, ActivityFeedResponse } from '@/types';

interface UseActivityFeedOptions {
  initialPageSize?: number;
  enabled?: boolean;
}

interface UseActivityFeedResult {
  items: ActivityFeedItem[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  page: number;
  filters: ActivityFeedFilters;
  loadMore: () => void;
  setFilters: (filters: ActivityFeedFilters) => void;
  refetch: () => void;
}

export function useActivityFeed(
  options: UseActivityFeedOptions = {}
): UseActivityFeedResult {
  const { initialPageSize = 10, enabled = true } = options;

  const [page, setPage] = useState(1);
  const [filters, setFiltersState] = useState<ActivityFeedFilters>({});

  // Build query key based on current filters and page
  const queryKey = ['activityFeed', page, filters];

  const {
    data: response,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<ActivityFeedResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: initialPageSize.toString(),
      });

      if (filters.type) {
        params.append('type', filters.type);
      }

      if (filters.creatorId) {
        params.append('creatorId', filters.creatorId);
      }

      const response = await fetch(`/api/activity/feed?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch activity feed');
      }

      return response.json();
    },
    enabled,
    staleTime: 30_000, // 30 seconds
  });

  const items = response?.items || [];
  const hasMore = response?.hasMore || false;
  const total = response?.total || 0;

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage((prev) => prev + 1);
    }
  }, [loading, hasMore]);

  const setFilters = useCallback(
    (newFilters: ActivityFeedFilters) => {
      setFiltersState(newFilters);
      setPage(1); // Reset to first page when filters change
    },
    []
  );

  return {
    items,
    loading,
    error: error as Error | null,
    hasMore,
    total,
    page,
    filters,
    loadMore,
    setFilters,
    refetch,
  };
}
