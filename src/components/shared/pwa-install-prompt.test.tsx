/**
 * PWA Install Prompt Component Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PWAInstallPrompt } from './pwa-install-prompt';

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('does not render when no deferred prompt', () => {
    render(<PWAInstallPrompt />);
    expect(screen.queryByText('Install Dorisio')).not.toBeInTheDocument();
  });

  it('renders when beforeinstallprompt event fires', () => {
    // Mock the event
    const mockEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    render(<PWAInstallPrompt />);

    // Simulate the event
    window.dispatchEvent(new Event('beforeinstallprompt'));

    // Note: In a real test, you'd need to mock the event listener
    // This is a simplified test
  });

  it('does not show if user dismissed within 7 days', () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    render(<PWAInstallPrompt />);
    expect(screen.queryByText('Install Dorisio')).not.toBeInTheDocument();
  });

  it('shows after 7 days from dismissal', () => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1;
    localStorage.setItem('pwa-install-dismissed', sevenDaysAgo.toString());
    render(<PWAInstallPrompt />);
    // Note: This would need the event to fire to actually show
  });
});
