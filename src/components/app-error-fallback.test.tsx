import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { AppErrorFallback } from './app-error-fallback';
import { captureError } from '@/lib/monitoring';

vi.mock('@/lib/monitoring', () => ({
  captureError: vi.fn(),
}));

describe('AppErrorFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the error message inside an alert region', () => {
    render(<AppErrorFallback error={new Error('Boom')} reset={vi.fn()} scope="app/error" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('reports the error to monitoring with the boundary scope', () => {
    const error = new Error('Boom');
    render(<AppErrorFallback error={error} reset={vi.fn()} scope="app/(app)/error" />);

    expect(captureError).toHaveBeenCalledWith(error, {
      boundary: 'app/(app)/error',
      digest: undefined,
    });
  });

  it('calls reset when the user retries', () => {
    const reset = vi.fn();
    render(<AppErrorFallback error={new Error('Boom')} reset={reset} scope="app/error" />);

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('shows a generic message when the error carries none', () => {
    render(<AppErrorFallback error={new Error('')} reset={vi.fn()} scope="app/global-error" />);

    expect(screen.getByText(/unexpected error occurred/i)).toBeInTheDocument();
  });
});
