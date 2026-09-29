import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePushNotificationPreferenceStore } from './push-notification-preference-store';

describe('usePushNotificationPreferenceStore', () => {
  beforeEach(() => {
    localStorage.clear();
    usePushNotificationPreferenceStore.setState({ optedIn: false });
  });

  it('defaults to opted out', () => {
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(false);
  });

  it('sets opted-in to true', () => {
    usePushNotificationPreferenceStore.getState().setOptedIn(true);
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(true);
  });

  it('sets opted-in back to false', () => {
    usePushNotificationPreferenceStore.getState().setOptedIn(true);
    usePushNotificationPreferenceStore.getState().setOptedIn(false);
    expect(usePushNotificationPreferenceStore.getState().optedIn).toBe(false);
  });

  it('persists the opt-in flag to localStorage', () => {
    usePushNotificationPreferenceStore.getState().setOptedIn(true);

    const stored = JSON.parse(
      localStorage.getItem('Dorisio-push-notification-preference') || '{}'
    );
    expect(stored.state.optedIn).toBe(true);
  });

  it('restores a persisted opt-in preference across a simulated reload', async () => {
    vi.resetModules();
    localStorage.setItem(
      'Dorisio-push-notification-preference',
      JSON.stringify({ state: { optedIn: true }, version: 0 })
    );

    const { usePushNotificationPreferenceStore: reloaded } = await import(
      './push-notification-preference-store'
    );

    await vi.waitFor(() => {
      expect(reloaded.getState().optedIn).toBe(true);
    });
  });
});
