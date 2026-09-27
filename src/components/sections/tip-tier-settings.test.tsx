import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TipTierSettings } from './tip-tier-settings';
import { useTipTierStore } from '@/stores/tip-tier-store';

describe('TipTierSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTipTierStore.setState({
      tiersByCreator: {},
      recentCustomAmounts: [],
      recentCustomAmountsByCreator: {},
    });
  });

  it('renders default tip tiers in ascending order', () => {
    render(<TipTierSettings creatorId="creator-1" />);

    expect(screen.getByText('Suggested Tip Presets')).toBeInTheDocument();
    expect(screen.getByLabelText('Configured tip tiers')).toBeInTheDocument();

    const tierItems = screen.getByLabelText('Configured tip tiers');
    expect(tierItems).toHaveTextContent('$1');
    expect(tierItems).toHaveTextContent('$5');
    expect(tierItems).toHaveTextContent('$10');
    expect(tierItems).toHaveTextContent('$25');
  });

  it('allows adding a new valid preset tier', async () => {
    const user = userEvent.setup();
    render(<TipTierSettings creatorId="creator-1" />);

    const input = screen.getByPlaceholderText('e.g. 50');
    await user.type(input, '50');
    await user.click(screen.getByRole('button', { name: 'Add Preset Tier' }));

    expect(screen.getByLabelText('Configured tip tiers')).toHaveTextContent('$50');
    expect(screen.getByRole('status')).toHaveTextContent('Added $50 to preset tiers');
  });

  it('shows error when adding invalid or duplicate tier', async () => {
    const user = userEvent.setup();
    render(<TipTierSettings creatorId="creator-1" />);

    const input = screen.getByPlaceholderText('e.g. 50');
    await user.type(input, '5');
    await user.click(screen.getByRole('button', { name: 'Add Preset Tier' }));

    expect(screen.getByRole('alert')).toHaveTextContent('$5 is already in your preset tiers.');

    await user.clear(input);
    await user.type(input, '0');
    await user.click(screen.getByRole('button', { name: 'Add Preset Tier' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid amount greater than $0.');
  });

  it('allows removing a preset tier', async () => {
    const user = userEvent.setup();
    render(<TipTierSettings creatorId="creator-1" />);

    const removeBtn = screen.getByLabelText('Remove $10 tier');
    await user.click(removeBtn);

    expect(screen.queryByLabelText('Remove $10 tier')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Removed $10 from preset tiers');
  });

  it('allows resetting preset tiers to defaults', async () => {
    const user = userEvent.setup();
    render(<TipTierSettings creatorId="creator-1" />);

    // Remove $1
    await user.click(screen.getByLabelText('Remove $1 tier'));
    expect(screen.queryByLabelText('Remove $1 tier')).not.toBeInTheDocument();

    // Reset
    await user.click(screen.getByRole('button', { name: 'Reset to Defaults' }));
    expect(screen.getByLabelText('Remove $1 tier')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Reset preset tiers to default');
  });

  it('displays the preview layout with preset tiers and custom placeholder', () => {
    render(<TipTierSettings creatorId="creator-1" />);

    expect(screen.getByText('Supporter View Preview (Mobile Layout)')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});
