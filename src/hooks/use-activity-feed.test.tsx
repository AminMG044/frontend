/**
 * useActivityFeed Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActivityFeed } from './use-activity-feed';

describe('useActivityFeed', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }): JSX.Element => {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('fetches activity feed items', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: '1',
                type: 'announcement',
                creatorId: 'creator1',
                creatorName: 'Test Creator',
                title: 'Test Announcement',
                createdAt: new Date().toISOString(),
              },
            ],
            total: 1,
            page: 1,
            pageSize: 10,
            hasMore: false,
          }),
      } as Response)
    );

    const { result } = renderHook(() => useActivityFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].title).toBe('Test Announcement');
  });

  it('handles loading state', () => {
    global.fetch = vi.fn(() => new Promise(() => {}));

    const { result } = renderHook(() => useActivityFeed(), { wrapper });

    expect(result.current.loading).toBe(true);
  });

  it('handles error state', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
      } as Response)
    );

    const { result } = renderHook(() => useActivityFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).not.toBeNull();
  });

  it('applies filters', async () => {
    global.fetch = vi.fn((url) => {
      const urlStr = url as string;
      if (urlStr.includes('type=tip')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [
                {
                  id: '1',
                  type: 'tip',
                  creatorId: 'creator1',
                  creatorName: 'Test Creator',
                  title: 'Test Tip',
                  amount: 50,
                  createdAt: new Date().toISOString(),
                },
              ],
              total: 1,
              page: 1,
              pageSize: 10,
              hasMore: false,
            }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [],
            total: 0,
            page: 1,
            pageSize: 10,
            hasMore: false,
          }),
      } as Response);
    });

    const { result } = renderHook(() => useActivityFeed(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setFilters({ type: 'tip' });

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].type).toBe('tip');
    });
  });

  it('loads more items', async () => {
    let callCount = 0;
    global.fetch = vi.fn(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                id: callCount.toString(),
                type: 'announcement',
                creatorId: 'creator1',
                creatorName: 'Test Creator',
                title: `Test ${callCount}`,
                createdAt: new Date().toISOString(),
              },
            ],
            total: 2,
            page: callCount,
            pageSize: 1,
            hasMore: callCount === 1,
          }),
      } as Response);
    });

    const { result } = renderHook(() => useActivityFeed({ initialPageSize: 1 }), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    result.current.loadMore();

    await waitFor(() => {
      expect(result.current.items).toHaveLength(2);
    });
  });
});
