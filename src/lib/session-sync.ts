/**
 * Cross-Tab Session Management and State Persistence
 *
 * Synchronizes authentication and user state across multiple browser tabs
 * in real-time (<100ms latency) using BroadcastChannel with a fallback
 * to localStorage storage events.
 */

import { updateSDKToken } from '@/lib/sdk-client';
import type { useAuthStore } from '@/stores/auth-store';

export type SessionEventType = 'LOGIN' | 'LOGOUT' | 'UPDATE_USER' | 'SYNC_STATE' | 'TAB_PING';

export interface SessionSyncMessage<T = unknown> {
  type: SessionEventType;
  payload?: T;
  sourceTabId: string;
  timestamp: number;
}

export const SESSION_CHANNEL_NAME = 'dorisio_session_sync_channel';
export const AUTH_STORAGE_KEY = 'Dorisio-auth';
export const LOGOUT_EVENT_STORAGE_KEY = 'dorisio_logout_timestamp';

// Unique identifier for the current browser tab session
let currentTabId: string = '';

export function getTabId(): string {
  if (currentTabId) return currentTabId;
  if (typeof window !== 'undefined') {
    try {
      const stored = window.sessionStorage?.getItem('dorisio_tab_id');
      if (stored) {
        currentTabId = stored;
        return currentTabId;
      }
      const newId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      window.sessionStorage?.setItem('dorisio_tab_id', newId);
      currentTabId = newId;
      return currentTabId;
    } catch {
      // sessionStorage might be restricted
      currentTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return currentTabId;
    }
  }
  return 'server_tab';
}

let broadcastChannel: BroadcastChannel | null = null;
let storageListener: ((event: StorageEvent) => void) | null = null;
let isBroadcasting = false;

/**
 * Get or initialize BroadcastChannel if supported
 */
function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && typeof window.BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(SESSION_CHANNEL_NAME);
    } catch (e) {
      console.warn('BroadcastChannel initialization failed, falling back to storage events:', e);
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

/**
 * Broadcast an authentication or session event to all other open tabs
 */
export function broadcastSessionEvent<T = unknown>(type: SessionEventType, payload?: T): void {
  if (typeof window === 'undefined') return;

  const message: SessionSyncMessage<T> = {
    type,
    payload,
    sourceTabId: getTabId(),
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel (primary - fastest, <10ms latency)
  const channel = getChannel();
  if (channel) {
    try {
      channel.postMessage(message);
    } catch (e) {
      console.warn('Failed to postMessage on BroadcastChannel:', e);
    }
  }

  // 2. Storage event fallback for older browsers / isolated contexts
  if (type === 'LOGOUT') {
    try {
      window.localStorage.setItem(LOGOUT_EVENT_STORAGE_KEY, String(Date.now()));
    } catch {
      // ignore localStorage quota/restriction errors
    }
  }
}

/**
 * Parses persisted auth state from localStorage safely.
 */
export function readPersistedAuthState(): { state?: { token: string | null; user: unknown } } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read or parse persisted auth state:', err);
    return null;
  }
}

/**
 * Initializes cross-tab session synchronization on the given auth store.
 * Subscribes to BroadcastChannel and window storage events.
 */
export function initSessionSync(store: typeof useAuthStore): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Prevent multiple active initializations
  cleanupSessionSync();

  const handleIncomingMessage = (message: SessionSyncMessage) => {
    if (!message || message.sourceTabId === getTabId()) {
      return; // Ignore own messages
    }

    switch (message.type) {
      case 'LOGOUT': {
        const state = store.getState();
        if (state.isAuthenticated || state.token || state.user) {
          isBroadcasting = true;
          try {
            updateSDKToken(null);
            store.setState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          } finally {
            isBroadcasting = false;
          }
        }
        break;
      }

      case 'LOGIN': {
        const { user, token } = (message.payload || {}) as { user: any; token: string };
        if (token && user) {
          isBroadcasting = true;
          try {
            updateSDKToken(token);
            store.setState({
              user,
              token,
              isAuthenticated: true,
              isLoading: false,
            });
          } finally {
            isBroadcasting = false;
          }
        }
        break;
      }

      case 'UPDATE_USER': {
        const { user } = (message.payload || {}) as { user: any };
        if (user) {
          isBroadcasting = true;
          try {
            store.setState({
              user,
              isAuthenticated: !!user,
            });
          } finally {
            isBroadcasting = false;
          }
        }
        break;
      }

      case 'SYNC_STATE': {
        const parsed = readPersistedAuthState();
        isBroadcasting = true;
        try {
          if (parsed?.state?.token && parsed?.state?.user) {
            updateSDKToken(parsed.state.token);
            store.setState({
              user: parsed.state.user as any,
              token: parsed.state.token,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            updateSDKToken(null);
            store.setState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } finally {
          isBroadcasting = false;
        }
        break;
      }
    }
  };

  // 1. BroadcastChannel listener
  const channel = getChannel();
  if (channel) {
    channel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
      handleIncomingMessage(event.data);
    };
  }

  // 2. Storage event listener (handles cross-tab storage changes)
  storageListener = (event: StorageEvent) => {
    // Other tab logged out via localStorage marker or clearing auth
    if (event.key === LOGOUT_EVENT_STORAGE_KEY) {
      handleIncomingMessage({
        type: 'LOGOUT',
        sourceTabId: 'other_tab',
        timestamp: Date.now(),
      });
      return;
    }

    if (event.key === AUTH_STORAGE_KEY) {
      if (!event.newValue) {
        // Storage was cleared in another tab
        handleIncomingMessage({
          type: 'LOGOUT',
          sourceTabId: 'other_tab',
          timestamp: Date.now(),
        });
      } else {
        // Auth state was updated in another tab
        try {
          const parsed = JSON.parse(event.newValue);
          if (parsed?.state?.token && parsed?.state?.user) {
            handleIncomingMessage({
              type: 'LOGIN',
              payload: { user: parsed.state.user, token: parsed.state.token },
              sourceTabId: 'other_tab',
              timestamp: Date.now(),
            });
          } else {
            handleIncomingMessage({
              type: 'LOGOUT',
              sourceTabId: 'other_tab',
              timestamp: Date.now(),
            });
          }
        } catch (e) {
          console.warn('Failed parsing auth state from storage event:', e);
        }
      }
    }
  };

  window.addEventListener('storage', storageListener);

  return cleanupSessionSync;
}

/**
 * Tears down BroadcastChannel and storage listeners
 */
export function cleanupSessionSync(): void {
  if (typeof window !== 'undefined') {
    if (storageListener) {
      window.removeEventListener('storage', storageListener);
      storageListener = null;
    }
  }

  if (broadcastChannel) {
    try {
      broadcastChannel.close();
    } catch {
      // ignore
    }
    broadcastChannel = null;
  }
}

/**
 * Returns whether a state change should be broadcast (false if receiving sync).
 */
export function shouldBroadcastStateChange(): boolean {
  return !isBroadcasting;
}
