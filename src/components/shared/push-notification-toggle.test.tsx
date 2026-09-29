/**
 * Tests for PushNotificationToggle. Mocks `usePushNotifications` directly
 * rather than the underlying browser APIs, since this component's job is
 * to render the right UI for a given hook state, not to re-verify the
 * hook's own subscribe/unsubscribe logic (covered in
 * use-push-notifications.test.tsx).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PushNotificationToggle } from './push-notification-toggle';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import type { UsePushNotificationsResult } from '@/hooks/use-push-notifications';

vi.mock('@/hooks/use-push-notifications', () => ({
  usePushNotifications: vi.fn(),
}));

const mockedUsePushNotifications = vi.mocked(usePushNotifications);

function baseState(overrides: Partial<UsePushNotificationsResult> = {}): UsePushNotificationsResult {
  return {
    isSupported: true,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
    error: null,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    ...overrides,
  };
}

describe('PushNotificationToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an unsupported message and no toggle when the browser lacks push support', () => {
    mockedUsePushNotifications.mockReturnValue(baseState({ isSupported: false }));

    render(<PushNotificationToggle />);

    expect(screen.getByText(/aren.t supported in this browser/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('renders an unchecked, enabled toggle in the default permission state', () => {
    mockedUsePushNotifications.mockReturnValue(baseState({ permission: 'default' }));

    render(<PushNotificationToggle />);

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();
    expect(toggle).not.toBeDisabled();
  });

  it('renders a checked toggle when already subscribed', () => {
    mockedUsePushNotifications.mockReturnValue(
      baseState({ permission: 'granted', isSubscribed: true })
    );

    render(<PushNotificationToggle />);

    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('calls subscribe() when toggled on', async () => {
    const subscribe = vi.fn();
    mockedUsePushNotifications.mockReturnValue(
      baseState({ permission: 'default', isSubscribed: false, subscribe })
    );
    const user = userEvent.setup();

    render(<PushNotificationToggle />);
    await user.click(screen.getByRole('switch'));

    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('calls unsubscribe() when toggled off while subscribed', async () => {
    const unsubscribe = vi.fn();
    mockedUsePushNotifications.mockReturnValue(
      baseState({ permission: 'granted', isSubscribed: true, unsubscribe })
    );
    const user = userEvent.setup();

    render(<PushNotificationToggle />);
    await user.click(screen.getByRole('switch'));

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('disables the toggle and shows browser-settings guidance when permission is denied', () => {
    mockedUsePushNotifications.mockReturnValue(baseState({ permission: 'denied' }));

    render(<PushNotificationToggle />);

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText(/blocked for this site at the browser level/i)).toBeInTheDocument();
    expect(screen.getByText(/browser's settings/i)).toBeInTheDocument();
  });

  it('shows an error message when subscribing failed', () => {
    mockedUsePushNotifications.mockReturnValue(
      baseState({ error: 'Push notifications are not fully configured for this environment yet.' })
    );

    render(<PushNotificationToggle />);

    expect(
      screen.getByText('Push notifications are not fully configured for this environment yet.')
    ).toBeInTheDocument();
  });

  it('disables the toggle while a subscribe/unsubscribe operation is loading', () => {
    mockedUsePushNotifications.mockReturnValue(baseState({ isLoading: true }));

    render(<PushNotificationToggle />);

    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
