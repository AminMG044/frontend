import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScheduledTipsDashboard } from './scheduled-tips-dashboard';
import { useScheduledTipsStore } from '@/stores/scheduled-tips-store';

describe('ScheduledTipsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScheduledTipsStore.setState({
      scheduledTips: [],
    });
  });

  it('renders empty state when there are no scheduled tips', () => {
    render(<ScheduledTipsDashboard creatorId="creator-1" />);

    expect(screen.getByText('Scheduled & Recurring Tips')).toBeInTheDocument();
    expect(screen.getByText('No scheduled tips yet')).toBeInTheDocument();
  });

  it('renders scheduled tips with amount, countdown, and frequency', () => {
    const futureDate = new Date(Date.now() + 86400000 * 3); // 3 days in future
    useScheduledTipsStore.getState().scheduleTip({
      creatorId: 'creator-1',
      amount: 40,
      scheduledDate: futureDate,
      frequency: 'weekly',
      message: 'Happy early birthday!',
    });

    render(<ScheduledTipsDashboard creatorId="creator-1" />);

    expect(screen.getByText('$40.00')).toBeInTheDocument();
    expect(screen.getByText('weekly')).toBeInTheDocument();
    expect(screen.getByText('"Happy early birthday!"')).toBeInTheDocument();
    expect(screen.getByText(/Due/)).toBeInTheDocument();
  });

  it('allows editing an existing pending tip', async () => {
    const user = userEvent.setup();
    const futureDate = new Date(Date.now() + 86400000 * 2);
    const tip = useScheduledTipsStore.getState().scheduleTip({
      creatorId: 'creator-1',
      amount: 25,
      scheduledDate: futureDate,
      frequency: 'once',
    });

    render(<ScheduledTipsDashboard creatorId="creator-1" />);

    const editBtn = screen.getByRole('button', { name: `Edit scheduled tip ${tip.id}` });
    await user.click(editBtn);

    expect(screen.getByTestId('edit-scheduled-tip-form')).toBeInTheDocument();

    const amountInput = screen.getByLabelText('Amount (USDC)');
    await user.clear(amountInput);
    await user.type(amountInput, '75');

    const monthlyBtn = screen.getByRole('button', { name: 'monthly' });
    await user.click(monthlyBtn);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(screen.getByText('$75.00')).toBeInTheDocument();
      expect(screen.getByText('monthly')).toBeInTheDocument();
    });
  });

  it('allows cancelling a pending tip', async () => {
    const user = userEvent.setup();
    const futureDate = new Date(Date.now() + 86400000 * 2);
    const tip = useScheduledTipsStore.getState().scheduleTip({
      creatorId: 'creator-1',
      amount: 15,
      scheduledDate: futureDate,
      frequency: 'once',
    });

    render(<ScheduledTipsDashboard creatorId="creator-1" />);

    const cancelBtn = screen.getByRole('button', { name: `Cancel scheduled tip ${tip.id}` });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByText('cancelled')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: `Edit scheduled tip ${tip.id}` })).not.toBeInTheDocument();
    });
  });

  it('allows executing a tip immediately', async () => {
    const user = userEvent.setup();
    const futureDate = new Date(Date.now() + 86400000 * 2);
    useScheduledTipsStore.getState().scheduleTip({
      creatorId: 'creator-1',
      amount: 30,
      scheduledDate: futureDate,
      frequency: 'once',
    });

    render(<ScheduledTipsDashboard creatorId="creator-1" />);

    const executeBtn = screen.getByRole('button', { name: 'Execute' });
    await user.click(executeBtn);

    await waitFor(() => {
      expect(screen.getByText('executed')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Successfully processed scheduled tip!');
    });
  });
});
