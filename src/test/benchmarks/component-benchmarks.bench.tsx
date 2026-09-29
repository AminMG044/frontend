import { describe, bench, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Label,
  Badge,
} from '@/components/ui';
import { Avatar } from '@/components/Avatar';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorMessage } from '@/components/ErrorMessage';
import { CreatorVerificationBadge } from '@/components/CreatorVerificationBadge';
import { SupporterBadge } from '@/components/SupporterBadge';
import { SubscriberBadge } from '@/components/SubscriberBadge';
import { CreatorBio } from '@/components/CreatorBio';
import { CreatorPortfolio } from '@/components/CreatorPortfolio';
import { CreatorSearchBar } from '@/components/CreatorSearchBar';
import { DorisioButton } from '@/components/DorisioButton';
import { TransactionFilterBar } from '@/components/TransactionFilterBar';
import { TipSourceBreakdown } from '@/components/TipSourceBreakdown';
import { TopTippersTable } from '@/components/TopTippersTable';
import { SupporterLeaderboard } from '@/components/SupporterLeaderboard';
import { AnalyticsSummaryCards } from '@/components/AnalyticsSummaryCards';
import { AnalyticsDateRangePicker } from '@/components/AnalyticsDateRangePicker';
import { EarningsTrendChart } from '@/components/EarningsTrendChart';
import { SubscriptionTiers } from '@/components/SubscriptionTiers';
import { SubscriptionManagement } from '@/components/SubscriptionManagement';
import { SubscriptionSettings } from '@/components/SubscriptionSettings';

// -----------------------------------------------------------------------------
// Benchmark infrastructure
// -----------------------------------------------------------------------------

// Thresholds are in milliseconds and represent the maximum allowed mean
// render time for a single mount of the component. They are consumed by
// scripts/check-perf-thresholds.js via the benchmark report file.
export const PERF_THRESHOLDS: Record<string, number> = {
  Button: 5,
  Card: 5,
  Input: 5,
  Label: 3,
  Badge: 3,
  Avatar: 5,
  LoadingSpinner: 5,
  Skeleton: 5,
  EmptyState: 8,
  ErrorMessage: 5,
  CreatorVerificationBadge: 5,
  SupporterBadge: 5,
  SubscriberBadge: 5,
  CreatorBio: 10,
  CreatorPortfolio: 15,
  CreatorSearchBar: 10,
  DorisioButton: 5,
  TransactionFilterBar: 15,
  TipSourceBreakdown: 20,
  TopTippersTable: 25,
  SupporterLeaderboard: 25,
  AnalyticsSummaryCards: 20,
  AnalyticsDateRangePicker: 15,
  EarningsTrendChart: 30,
  SubscriptionTiers: 20,
  SubscriptionManagement: 20,
  SubscriptionSettings: 20,
};

// Registry of components to benchmark. Each entry renders the component
// with realistic props so the measured time reflects actual usage.
export interface BenchmarkCase {
  name: string;
  render: () => React.ReactElement;
}

const noop = () => {};

export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    name: 'Button',
    render: () => <Button>Click me</Button>,
  },
  {
    name: 'Card',
    render: () => (
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    ),
  },
  {
    name: 'Input',
    render: () => <Input placeholder="Amount" />,
  },
  {
    name: 'Label',
    render: () => <Label htmlFor="amount">Amount</Label>,
  },
  {
    name: 'Badge',
    render: () => <Badge>Active</Badge>,
  },
  {
    name: 'Avatar',
    render: () => <Avatar src="/avatar.png" alt="Creator" />,
  },
  {
    name: 'LoadingSpinner',
    render: () => <LoadingSpinner />,
  },
  {
    name: 'Skeleton',
    render: () => <Skeleton className="h-4 w-24" />,
  },
  {
    name: 'EmptyState',
    render: () => <EmptyState title="No results" description="Try again later" />,
  },
  {
    name: 'ErrorMessage',
    render: () => <ErrorMessage>Something went wrong</ErrorMessage>,
  },
  {
    name: 'CreatorVerificationBadge',
    render: () => <CreatorVerificationBadge verified />,
  },
  {
    name: 'SupporterBadge',
    render: () => <SupporterBadge />,
  },
  {
    name: 'SubscriberBadge',
    render: () => <SubscriberBadge />,
  },
  {
    name: 'CreatorBio',
    render: () => <CreatorBio bio="Creator biography text" />,
  },
  {
    name: 'CreatorPortfolio',
    render: () => <CreatorPortfolio items={[]} />,
  },
  {
    name: 'CreatorSearchBar',
    render: () => <CreatorSearchBar onChange={noop} />,
  },
  {
    name: 'DorisioButton',
    render: () => <DorisioButton onClick={noop}>Send</DorisioButton>,
  },
  {
    name: 'TransactionFilterBar',
    render: () => <TransactionFilterBar onChange={noop} />,
  },
  {
    name: 'TipSourceBreakdown',
    render: () => <TipSourceBreakdown data={[]} />,
  },
  {
    name: 'TopTippersTable',
    render: () => <TopTippersTable data={[]} />,
  },
  {
    name: 'SupporterLeaderboard',
    render: () => <SupporterLeaderboard data={[]} />,
  },
  {
    name: 'AnalyticsSummaryCards',
    render: () => (
      <AnalyticsSummaryCards
        totalEarnings={0}
        totalTips={0}
        uniqueSupporters={0}
        averageTip={0}
      />
    ),
  },
  {
    name: 'AnalyticsDateRangePicker',
    render: () => <AnalyticsDateRangePicker onChange={noop} />,
  },
  {
    name: 'EarningsTrendChart',
    render: () => <EarningsTrendChart data={[]} />,
  },
  {
    name: 'SubscriptionTiers',
    render: () => <SubscriptionTiers tiers={{}} />,
  },
  {
    name: 'SubscriptionManagement',
    render: () => <SubscriptionManagement />,
  },
  {
    name: 'SubscriptionSettings',
    render: () => <SubscriptionSettings />,
  },
];

// -----------------------------------------------------------------------------
// Benchmark suite
// -----------------------------------------------------------------------------

describe('component render performance', () => {
  for (const case of BENCHMARK_CASES) {
    bench(case.name, () => {
      const { unmount } = render(case.render());
      unmount();
    });
  }
});

// Expose the case list and thresholds for the CI threshold checker.
if (typeof globalThis !== 'undefined') {
  (globalThis as typeof globalThis & {
    __PERF_THRESHOLDS__: Record<string, number>;
    __PERF_CASES__: string[];
  }).__PERF_THRESHOLDS__ = PERF_THRESHOLDS;
  (globalThis as typeof globalThis & {
    __PERF_THRESHOLDS__: Record<string, number>;
    __PERF_CASES__: string[];
  }).__PERF_CASES__ = BENCHMARK_CASES.map((c) => c.name);
}

if (typeof vi !== 'undefined') {
  vi.stub?''...
}
