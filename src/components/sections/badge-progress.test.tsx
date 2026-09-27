import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BadgeProgressCard } from './badge-progress';

const THRESHOLDS = { bronze: 10, silver: 50, gold: 200, platinum: 500 };

describe('BadgeProgressCard', () => {
  it('shows the current badge and amount remaining to the next tier', () => {
    render(<BadgeProgressCard totalSpend={30} thresholds={THRESHOLDS} />);

    expect(screen.getByText('$30.00')).toBeInTheDocument();
    expect(screen.getByText('Next: Silver')).toBeInTheDocument();
    expect(screen.getByText('$20.00 to go')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Bronze supporter badge' })).toBeInTheDocument();
  });

  it('reports progress through an accessible progressbar', () => {
    render(<BadgeProgressCard totalSpend={30} thresholds={THRESHOLDS} />);

    const progressbar = screen.getByRole('progressbar', {
      name: 'Progress to Silver badge',
    });
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows a top-tier message once platinum is reached', () => {
    render(<BadgeProgressCard totalSpend={900} thresholds={THRESHOLDS} />);

    expect(screen.getByText(/top tier reached/i)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
