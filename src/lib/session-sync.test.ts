import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initSessionSync,
  cleanupSessionSync,
  broadcastSessionEvent,
  getTabId,
  readPersistedAuthState,
  AUTH_STORAGE_KEY,
  LOGOUT_EVENT_STORAGE_KEY,
  SESSION_CHANNEL_NAME,
  type SessionSyncMessage,
} from './session-sync';

// Mock SDK client
vi.mock('@/lib/sdk-client', () => ({
  updateSDKToken: vi.fn(),
}));

describe('Session Sync and Cross-Tab State Persistence', () => {
  let mockStore: any;
  let mockState: any;
  let broadcastCallbacks: ((event: MessageEvent<SessionSyncMessage>) => void)[] = [];
  let storageCallbacks: ((event: StorageEvent) => void)[] = [];

  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent<SessionSyncMessage>) => void) | null = null;

    constructor(name: string) {
      this.name = name;
      broadcastCallbacks.push((event) => {
        if (this.onmessage) this.onmessage(event);
      });
    }

    postMessage(data: any) {
      // Simulate dispatching to other tabs asynchronously with ultra-low latency (<10ms)
      broadcastCallbacks.forEach((cb) => {
        cb(new MessageEvent('message', { data }));
      });
    }

    close() {}
  }

  beforeEach(() => {
    broadcastCallbacks = [];
    storageCallbacks = [];

    // Mock global BroadcastChannel
    (global as any).BroadcastChannel = MockBroadcastChannel;

    // Mock store
    mockState = {
      user: { id: 'user_1', email: 'test@example.com', role: 'fan' },
      token: 'jwt_token_123',
      isAuthenticated: true,
      isLoading: false,
    };

    mockStore = {
      getState: vi.fn(() => mockState),
      setState: vi.fn((patch: any) => {
        mockState = { ...mockState, ...patch };
      }),
    };

    // Mock window storage listener
    vi.spyOn(window, 'addEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'storage') {
        storageCallbacks.push(handler);
      }
    });

    vi.spyOn(window, 'removeEventListener').mockImplementation((event: string, handler: any) => {
      if (event === 'storage') {
        storageCallbacks = storageCallbacks.filter((h) => h !== handler);
      }
    });

    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanupSessionSync();
    vi.restoreAllMocks();
  });

  it('generates and persists a stable tab ID', () => {
    const tabId1 = getTabId();
    expect(tabId1).toBeDefined();
    expect(tabId1).toMatch(/^tab_/);

    const tabId2 = getTabId();
    expect(tabId2).toBe(tabId1);
  });

  it('syncs global logout across tabs via BroadcastChannel in <100ms', async () => {
    initSessionSync(mockStore);

    const startTime = performance.now();

    // Simulate an incoming LOGOUT from another tab
    const logoutMsg: SessionSyncMessage = {
      type: 'LOGOUT',
      sourceTabId: 'other_tab_999',
      timestamp: Date.now(),
    };

    broadcastCallbacks.forEach((cb) => {
      cb(new MessageEvent('message', { data: logoutMsg }));
    });

    const latency = performance.now() - startTime;
    expect(latency).toBeLessThan(100);

    expect(mockStore.setState).toHaveBeenCalledWith({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    expect(mockState.isAuthenticated).toBe(false);
  });

  it('syncs login across tabs via BroadcastChannel in <100ms', () => {
    mockState.isAuthenticated = false;
    mockState.user = null;
    mockState.token = null;

    initSessionSync(mockStore);

    const newUser = { id: 'user_2', email: 'alice@dorisio.dev', role: 'creator' };
    const newToken = 'new_jwt_abc';

    const startTime = performance.now();

    const loginMsg: SessionSyncMessage = {
      type: 'LOGIN',
      payload: { user: newUser, token: newToken },
      sourceTabId: 'tab_external_456',
      timestamp: Date.now(),
    };

    broadcastCallbacks.forEach((cb) => {
      cb(new MessageEvent('message', { data: loginMsg }));
    });

    const latency = performance.now() - startTime;
    expect(latency).toBeLessThan(100);

    expect(mockStore.setState).toHaveBeenCalledWith({
      user: newUser,
      token: newToken,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('syncs user profile update across tabs', () => {
    initSessionSync(mockStore);

    const updatedUser = { ...mockState.user, name: 'Alice Wonder' };

    const updateMsg: SessionSyncMessage = {
      type: 'UPDATE_USER',
      payload: { user: updatedUser },
      sourceTabId: 'tab_external_456',
      timestamp: Date.now(),
    };

    broadcastCallbacks.forEach((cb) => {
      cb(new MessageEvent('message', { data: updateMsg }));
    });

    expect(mockStore.setState).toHaveBeenCalledWith({
      user: updatedUser,
      isAuthenticated: true,
    });
  });

  it('handles logout via window storage event (fallback)', () => {
    initSessionSync(mockStore);

    const storageEvent = new StorageEvent('storage', {
      key: LOGOUT_EVENT_STORAGE_KEY,
      newValue: String(Date.now()),
    });

    storageCallbacks.forEach((cb) => cb(storageEvent));

    expect(mockStore.setState).toHaveBeenCalledWith({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('handles storage event when auth key is cleared in another tab', () => {
    initSessionSync(mockStore);

    const storageEvent = new StorageEvent('storage', {
      key: AUTH_STORAGE_KEY,
      newValue: null,
    });

    storageCallbacks.forEach((cb) => cb(storageEvent));

    expect(mockStore.setState).toHaveBeenCalledWith({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('handles storage event with updated auth JSON in another tab', () => {
    initSessionSync(mockStore);

    const newUser = { id: 'synced_user', email: 'sync@dorisio.dev' };
    const storageEvent = new StorageEvent('storage', {
      key: AUTH_STORAGE_KEY,
      newValue: JSON.stringify({
        state: { user: newUser, token: 'token_from_tab_2' },
      }),
    });

    storageCallbacks.forEach((cb) => cb(storageEvent));

    expect(mockStore.setState).toHaveBeenCalledWith({
      user: newUser,
      token: 'token_from_tab_2',
      isAuthenticated: true,
      isLoading: false,
    });
  });

  it('ignores broadcast messages originated from the same tab', () => {
    initSessionSync(mockStore);

    const selfMsg: SessionSyncMessage = {
      type: 'LOGOUT',
      sourceTabId: getTabId(),
      timestamp: Date.now(),
    };

    broadcastCallbacks.forEach((cb) => {
      cb(new MessageEvent('message', { data: selfMsg }));
    });

    // Should NOT call setState because sourceTabId is own tab
    expect(mockStore.setState).not.toHaveBeenCalled();
  });

  it('handles corrupted localStorage JSON gracefully', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{corrupted-non-json');
    const result = readPersistedAuthState();
    expect(result).toBeNull();
  });

  it('cleans up listeners on cleanupSessionSync', () => {
    initSessionSync(mockStore);
    expect(storageCallbacks.length).toBeGreaterThan(0);

    cleanupSessionSync();
    expect(window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});
