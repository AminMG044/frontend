import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SupporterLeaderboard } from './supporter-leaderboard';
import type { SupporterLeaderboardEntry } from '@/types/loyalty';

const THRESHOLDS = { bronze: 10, silver: 50, gold: 200, platinum: 500 };

const entries: SupporterLeaderboardEntry[] = [
  { id: 'a', name: 'Alice', totalAmount: 30, tipCount: 3, isPublic: true },
  { id: 'b', name: 'Bob', totalAmount: 600, tipCount: 12, isPublic: true },
  { id: 'c', name: 'Carol', totalAmount: 100, tipCount: 5, isPublic: false },
];

describe('SupporterLeaderboard', () => {
  it('renders supporters ranked by total amount', () => {
    render(<SupporterLeaderboard entries={entries} thresholds={THRESHOLDS} />);

    const list = screen.getByTestId('supporter-leaderboard-list');
    const items = within(list).getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('Bob')).toBeInTheDocument();
    expect(within(items[0]).getByText('#1')).toBeInTheDocument();
    expect(within(items[2]).getByText('Alice')).toBeInTheDocument();
  });

  it('shows the badge each supporter earned', () => {
    render(<SupporterLeaderboard entries={entries} thresholds={THRESHOLDS} />);

    expect(screen.getByRole('status', { name: 'Platinum supporter badge' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Silver supporter badge' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Bronze supporter badge' })).toBeInTheDocument();
  });

  it('filters to opted-in supporters when publicOnly is set', () => {
    render(<SupporterLeaderboard entries={entries} thresholds={THRESHOLDS} publicOnly />);

    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Carol')).not.toBeInTheDocument();
  });

  it('respects the limit prop', () => {
    render(<SupporterLeaderboard entries={entries} thresholds={THRESHOLDS} limit={1} />);

    const items = within(screen.getByTestId('supporter-leaderboard-list')).getAllByRole('listitem');
    expect(items).toHaveLength(1);
  });

  it('shows an empty state when there is nobody to rank', () => {
    render(<SupporterLeaderboard entries={[]} thresholds={THRESHOLDS} />);

    expect(screen.queryByTestId('supporter-leaderboard-list')).not.toBeInTheDocument();
    expect(screen.getByText(/no supporters to rank yet/i)).toBeInTheDocument();
  });
});
