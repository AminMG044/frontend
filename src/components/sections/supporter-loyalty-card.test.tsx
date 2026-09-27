import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SupporterLoyaltyCard } from './supporter-loyalty-card';
import { SUPPORTER_VISIBILITY_KEY } from '@/lib/loyalty';

describe('SupporterLoyaltyCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the supporter badge progress', () => {
    render(<SupporterLoyaltyCard creatorId="creator-1" supporterId="user-1" totalSpend={75} />);

    expect(screen.getByTestId('badge-progress-card')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Silver supporter badge' })).toBeInTheDocument();
  });

  it('persists the opt-in when the supporter makes their badge public', () => {
    render(<SupporterLoyaltyCard creatorId="creator-1" supporterId="user-1" totalSpend={75} />);

    const toggle = screen.getByRole('checkbox', {
      name: /show my badge on the public supporter profile/i,
    });
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Your badge is private')).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(screen.getByText('Your badge is public')).toBeInTheDocument();
    expect(localStorage.getItem(SUPPORTER_VISIBILITY_KEY)).toContain('"user-1":true');
  });

  it('disables the opt-in for signed-out visitors', () => {
    render(<SupporterLoyaltyCard creatorId="creator-1" totalSpend={0} />);

    expect(
      screen.getByRole('checkbox', {
        name: /show my badge on the public supporter profile/i,
      })
    ).toBeDisabled();
    expect(screen.getByText(/sign in to save your badge/i)).toBeInTheDocument();
  });
});
