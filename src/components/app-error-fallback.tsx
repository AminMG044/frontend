'use client';

import { useEffect } from 'react';

import { captureError } from '@/lib/monitoring';

export interface AppErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Short label identifying which boundary caught the error. */
  scope: string;
}

/**
 * Shared UI for Next.js App Router error segments (`error.tsx`,
 * `global-error.tsx`) and the client `ErrorBoundary`.
 *
 * It reports the error to monitoring exactly once per mount and offers the
 * user a retry that re-renders the failed segment.
 */
export function AppErrorFallback({ error, reset, scope }: AppErrorFallbackProps): JSX.Element {
  useEffect(() => {
    captureError(error, { boundary: scope, digest: error.digest });
  }, [error, scope]);

  return (
    <div
      role="alert"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
        <svg
          className="h-8 w-8 text-red-600 dark:text-red-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Something went wrong
        </h1>
        <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Try again
        </button>
        <a
          href="/"
          className="text-sm font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-400"
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
