import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: sentry.captureException,
  setUser: sentry.setUser,
  addBreadcrumb: sentry.addBreadcrumb,
}));

import {
  addMonitoringBreadcrumb,
  captureError,
  getMonitoringDsn,
  isMonitoringEnabled,
  setMonitoringUser,
} from './monitoring';

const DSN = 'https://abc123.ingest.sentry.io/1';

describe('monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  it('is disabled when no DSN is configured', () => {
    expect(getMonitoringDsn()).toBeUndefined();
    expect(isMonitoringEnabled()).toBe(false);
  });

  it('is enabled when a DSN is configured', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;
    expect(getMonitoringDsn()).toBe(DSN);
    expect(isMonitoringEnabled()).toBe(true);
  });

  it('captures an Error with extra context', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;
    const error = new Error('boom');

    captureError(error, { componentStack: 'at Foo' });

    expect(sentry.captureException).toHaveBeenCalledWith(error, {
      extra: { componentStack: 'at Foo' },
    });
  });

  it('normalizes non-Error values before reporting', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;

    captureError('something went wrong');

    const [reported] = sentry.captureException.mock.calls[0];
    expect(reported).toBeInstanceOf(Error);
    expect((reported as Error).message).toBe('something went wrong');
  });

  it('does not report when monitoring is disabled', () => {
    captureError(new Error('ignored'));
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('sets and clears the user context', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;

    setMonitoringUser({ id: 'user-1', email: 'a@b.com', username: 'ada' });
    expect(sentry.setUser).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'a@b.com',
      username: 'ada',
    });

    setMonitoringUser(null);
    expect(sentry.setUser).toHaveBeenLastCalledWith(null);
  });

  it('records breadcrumbs with an info level by default', () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;

    addMonitoringBreadcrumb({ category: 'navigation', message: 'Navigated to /creators' });

    expect(sentry.addBreadcrumb).toHaveBeenCalledWith({
      category: 'navigation',
      message: 'Navigated to /creators',
      level: 'info',
      data: undefined,
    });
  });
});
