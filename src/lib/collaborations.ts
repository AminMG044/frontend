import type { Notification } from '@/types';
import { readStoredValue, writeStoredValue } from '@/lib/subscriptions';

export const COLLABORATIONS_STORAGE_KEY = 'dorisio:collaborations';
export const COLLABORATIONS_CHANGED_EVENT = 'dorisio:collaborations-changed';

export type CollaborationStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface CreatorCollaboration {
  id: string;
  inviterId: string;
  inviterUserId: string;
  inviterUsername: string;
  inviterName: string;
  inviteeId: string;
  inviteeUserId: string;
  inviteeUsername: string;
  inviteeName: string;
  inviterShare: number;
  inviteeShare: number;
  status: CollaborationStatus;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  endedAt?: string;
}

export interface CollaborationSettings {
  creatorId: string;
  acceptingInvites: boolean;
  guestAppearancesEnabled: boolean;
  defaultRevenueShare: number;
}

interface CollaborationNotice extends Omit<Notification, 'type'> {
  type: 'collaboration';
  collaborationId: string;
}

interface CollaborationState {
  collaborations: CreatorCollaboration[];
  settings: CollaborationSettings[];
  notifications: CollaborationNotice[];
}

export interface CollaborationStats {
  total: number;
  active: number;
  pending: number;
  completed: number;
  configuredRevenueShare: number;
}

const EMPTY_STATE: CollaborationState = {
  collaborations: [],
  settings: [],
  notifications: [],
};

function readState(): CollaborationState {
  const stored = readStoredValue<Partial<CollaborationState>>(
    COLLABORATIONS_STORAGE_KEY,
    EMPTY_STATE
  );

  return {
    collaborations: Array.isArray(stored.collaborations) ? [...stored.collaborations] : [],
    settings: Array.isArray(stored.settings) ? [...stored.settings] : [],
    notifications: Array.isArray(stored.notifications) ? [...stored.notifications] : [],
  };
}

function writeState(state: CollaborationState): void {
  writeStoredValue(COLLABORATIONS_STORAGE_KEY, state);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COLLABORATIONS_CHANGED_EVENT));
  }
}

function createId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function updateState<T>(update: (state: CollaborationState) => [CollaborationState, T]): T {
  const [state, result] = update(readState());
  writeState(state);
  return result;
}

function addNotice(
  state: CollaborationState,
  userId: string,
  collaborationId: string,
  title: string,
  message: string,
  createdAt: string
): void {
  state.notifications.unshift({
    id: createId('collaboration-notice'),
    userId,
    type: 'collaboration',
    title,
    message,
    read: false,
    createdAt,
    collaborationId,
  });
}

export function getCollaborationSettings(creatorId: string): CollaborationSettings {
  return (
    readState().settings.find((settings) => settings.creatorId === creatorId) ?? {
      creatorId,
      acceptingInvites: true,
      guestAppearancesEnabled: true,
      defaultRevenueShare: 50,
    }
  );
}

export function saveCollaborationSettings(settings: CollaborationSettings): CollaborationSettings {
  if (
    !settings.creatorId ||
    !Number.isInteger(settings.defaultRevenueShare) ||
    settings.defaultRevenueShare < 1 ||
    settings.defaultRevenueShare > 99
  ) {
    throw new Error('Choose a revenue share between 1% and 99%.');
  }

  return updateState((state) => {
    state.settings = [
      ...state.settings.filter((item) => item.creatorId !== settings.creatorId),
      settings,
    ];
    return [state, settings];
  });
}

export interface CreateCollaborationInput {
  inviterId: string;
  inviterUserId: string;
  inviterUsername: string;
  inviterName: string;
  inviteeId: string;
  inviteeUserId: string;
  inviteeUsername: string;
  inviteeName: string;
  inviterShare: number;
}

export function createCollaborationInvite(
  input: CreateCollaborationInput,
  now = new Date()
): CreatorCollaboration {
  if (
    !input.inviterId ||
    !input.inviteeId ||
    !input.inviterUserId ||
    !input.inviteeUserId ||
    input.inviterId === input.inviteeId
  ) {
    throw new Error('Choose another creator to invite.');
  }
  if (
    !Number.isInteger(input.inviterShare) ||
    input.inviterShare < 1 ||
    input.inviterShare > 99
  ) {
    throw new Error('Revenue share must be between 1% and 99%.');
  }
  if (!input.inviterUsername || !input.inviteeUsername || !input.inviteeName.trim()) {
    throw new Error('Creator details are incomplete.');
  }

  return updateState((state) => {
    const inviteeSettings = state.settings.find(
      (settings) => settings.creatorId === input.inviteeId
    );
    if (inviteeSettings && !inviteeSettings.acceptingInvites) {
      throw new Error('This creator is not accepting collaboration invites.');
    }

    const hasOpenCollaboration = state.collaborations.some((item) => {
      const samePair =
        (item.inviterId === input.inviterId && item.inviteeId === input.inviteeId) ||
        (item.inviterId === input.inviteeId && item.inviteeId === input.inviterId);
      return samePair && (item.status === 'pending' || item.status === 'accepted');
    });
    if (hasOpenCollaboration) {
      throw new Error('An open collaboration already exists between these creators.');
    }

    const createdAt = now.toISOString();
    const collaboration: CreatorCollaboration = {
      ...input,
      id: createId('collaboration'),
      inviteeShare: 100 - input.inviterShare,
      status: 'pending',
      createdAt,
      updatedAt: createdAt,
    };
    state.collaborations.unshift(collaboration);
    addNotice(
      state,
      input.inviteeUserId,
      collaboration.id,
      'New collaboration invite',
      `@${input.inviterUsername} invited you to collaborate.`,
      createdAt
    );
    return [state, collaboration];
  });
}

export function respondToCollaborationInvite(
  collaborationId: string,
  creatorId: string,
  accept: boolean,
  now = new Date()
): CreatorCollaboration {
  return updateState((state) => {
    const collaboration = state.collaborations.find((item) => item.id === collaborationId);
    if (!collaboration || collaboration.inviteeId !== creatorId || collaboration.status !== 'pending') {
      throw new Error('This collaboration invite is no longer available.');
    }

    const updatedAt = now.toISOString();
    collaboration.status = accept ? 'accepted' : 'declined';
    collaboration.updatedAt = updatedAt;
    if (accept) collaboration.acceptedAt = updatedAt;
    addNotice(
      state,
      collaboration.inviterUserId,
      collaboration.id,
      accept ? 'Collaboration accepted' : 'Collaboration declined',
      `@${collaboration.inviteeUsername} ${accept ? 'accepted' : 'declined'} your invite.`,
      updatedAt
    );
    return [state, collaboration];
  });
}

export function endCollaboration(
  collaborationId: string,
  creatorId: string,
  now = new Date()
): CreatorCollaboration {
  return updateState((state) => {
    const collaboration = state.collaborations.find((item) => item.id === collaborationId);
    if (
      !collaboration ||
      (collaboration.inviterId !== creatorId && collaboration.inviteeId !== creatorId) ||
      collaboration.status !== 'accepted'
    ) {
      throw new Error('This collaboration cannot be completed.');
    }

    const endedAt = now.toISOString();
    collaboration.status = 'completed';
    collaboration.updatedAt = endedAt;
    collaboration.endedAt = endedAt;
    return [state, collaboration];
  });
}

export function getCollaborationsForCreator(creatorId: string): CreatorCollaboration[] {
  return readState().collaborations.filter(
    (item) => item.inviterId === creatorId || item.inviteeId === creatorId
  );
}

export function getPublicCollaborations(creatorId: string): CreatorCollaboration[] {
  const guestAppearancesEnabled = getCollaborationSettings(creatorId).guestAppearancesEnabled;
  if (!guestAppearancesEnabled) return [];
  return getCollaborationsForCreator(creatorId).filter((item) => item.status === 'accepted');
}

export function getCollaborationStats(creatorId: string): CollaborationStats {
  const collaborations = getCollaborationsForCreator(creatorId);
  const stats = collaborations.reduce<CollaborationStats>(
    (stats, collaboration) => {
      stats.total += 1;
      if (collaboration.status === 'accepted') {
        stats.active += 1;
        stats.configuredRevenueShare +=
          collaboration.inviterId === creatorId
            ? collaboration.inviterShare
            : collaboration.inviteeShare;
      }
      if (collaboration.status === 'pending') stats.pending += 1;
      if (collaboration.status === 'completed') stats.completed += 1;
      return stats;
    },
    { total: 0, active: 0, pending: 0, completed: 0, configuredRevenueShare: 0 }
  );
  if (stats.active > 0) stats.configuredRevenueShare /= stats.active;
  return stats;
}

export function getCollaborationNotifications(userId: string): CollaborationNotice[] {
  return readState().notifications.filter((notification) => notification.userId === userId);
}

export function markCollaborationNotificationRead(notificationId: string): void {
  updateState((state) => {
    const notification = state.notifications.find((item) => item.id === notificationId);
    if (notification) notification.read = true;
    return [state, undefined];
  });
}

export function markAllCollaborationNotificationsRead(userId: string): void {
  updateState((state) => {
    state.notifications.forEach((notification) => {
      if (notification.userId === userId) notification.read = true;
    });
    return [state, undefined];
  });
}