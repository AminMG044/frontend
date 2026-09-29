/**
 * Tests for PushNotificationPermissionPrompt. Mocks `usePushNotifications`
 * directly, same approach as push-notification-toggle.test.tsx, since this
 * component's job is choosing whether/what to render for a given hook
 * state, not re-testing the hook itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PushNotificationPermissionPrompt } from './push-notification-permission-prompt';
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

describe('PushNotificationPermissionPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the prompt when permission is still "default" and not subscribed', () => {
    mockedUsePushNotifications.mockReturnValue(baseState());

    render(<PushNotificationPermissionPrompt />);

    expect(screen.getByText(/stay updated with push notifications/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enable notifications/i })).toBeInTheDocument();
  });

  it('renders nothing when the browser does not support push', () => {
    mockedUsePushNotifications.mockReturnValue(baseState({ isSupported: false }));

    const { container } = render(<PushNotificationPermissionPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing once already subscribed', () => {
    mockedUsePushNotifications.mockReturnValue(
      baseState({ isSubscribed: true, permission: 'granted' })
    );

    const { container } = render(<PushNotificationPermissionPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when permission has already been denied', () => {
    mockedUsePushNotifications.mockReturnValue(baseState({ permission: 'denied' }));

    const { container } = render(<PushNotificationPermissionPrompt />);

    expect(container).toBeEmptyDOMElement();
  });

  it('calls subscribe() when "Enable notifications" is clicked', async () => {
    const subscribe = vi.fn();
    mockedUsePushNotifications.mockReturnValue(baseState({ subscribe }));
    const user = userEvent.setup();

    render(<PushNotificationPermissionPrompt />);
    await user.click(screen.getByRole('button', { name: /enable notifications/i }));

    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it('dismisses the banner when "Not now" is clicked, without calling subscribe()', async () => {
    const subscribe = vi.fn();
    mockedUsePushNotifications.mockReturnValue(baseState({ subscribe }));
    const user = userEvent.setup();

    render(<PushNotificationPermissionPrompt />);
    await user.click(screen.getByRole('button', { name: /not now/i }));

    expect(screen.queryByText(/stay updated with push notifications/i)).not.toBeInTheDocument();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('dismisses the banner via the close (X) button', async () => {
    mockedUsePushNotifications.mockReturnValue(baseState());
    const user = userEvent.setup();

    render(<PushNotificationPermissionPrompt />);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByText(/stay updated with push notifications/i)).not.toBeInTheDocument();
  });

  it('shows a loading label on the enable button while subscribing', () => {
    mockedUsePushNotifications.mockReturnValue(baseState({ isLoading: true }));

    render(<PushNotificationPermissionPrompt />);

    expect(screen.getByRole('button', { name: /enabling/i })).toBeDisabled();
  });
});
