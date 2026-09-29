/**
 * Offline Page
 * Shown when the app is offline and no cached content is available
 */

import { WifiOff } from 'lucide-react';

export default function OfflinePage(): JSX.Element {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">You're Offline</h1>
        <p className="text-muted-foreground max-w-md">
          It looks like you're not connected to the internet. Please check your
          connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
