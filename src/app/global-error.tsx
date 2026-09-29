'use client';

import { AppErrorFallback } from '@/components/app-error-fallback';

/**
 * Root error boundary. Used when the root layout itself throws, so it must
 * render its own `<html>`/`<body>`. This is the last line of defence against a
 * blank page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <html lang="en">
      <body>
        <AppErrorFallback error={error} reset={reset} scope="app/global-error" />
      </body>
    </html>
  );
}
