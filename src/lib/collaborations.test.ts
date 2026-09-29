import { afterEach, describe, expect, it } from 'vitest';
import {
  COLLABORATIONS_STORAGE_KEY,
  createCollaborationInvite,
  endCollaboration,
  getCollaborationNotifications,
  getCollaborationSettings,
  getCollaborationStats,
  getCollaborationsForCreator,
  getPublicCollaborations,
  markCollaborationNotificationRead,
  respondToCollaborationInvite,
  saveCollaborationSettings,
} from './collaborations';

const fixedDate = new Date('2026-09-01T12:00:00.000Z');

function invite() {
  return createCollaborationInvite(
    {
      inviterId: 'creator-a',
      inviterUserId: 'user-a',
      inviterUsername: 'alpha',
      inviterName: 'Alpha Creator',
      inviteeId: 'creator-b',
      inviteeUserId: 'user-b',
      inviteeUsername: 'beta',
      inviteeName: 'Beta Creator',
      inviterShare: 60,
    },
    fixedDate
  );
}

afterEach(() => {
  window.localStorage.removeItem(COLLABORATIONS_STORAGE_KEY);
});

describe('creator collaborations', () => {
  it('creates an invite, notifies the invitee, and records a balanced accepted split', () => {
    const collaboration = invite();

    expect(collaboration.status).toBe('pending');
    expect(collaboration.inviterShare + collaboration.inviteeShare).toBe(100);
    expect(getCollaborationNotifications('user-b')).toMatchObject([
      { type: 'collaboration', title: 'New collaboration invite', read: false },
    ]);

    const accepted = respondToCollaborationInvite(
      collaboration.id,
      'creator-b',
      true,
      new Date('2026-09-02T12:00:00.000Z')
    );

    expect(accepted.status).toBe('accepted');
    expect(accepted.acceptedAt).toBe('2026-09-02T12:00:00.000Z');
    expect(getCollaborationStats('creator-a')).toMatchObject({
      total: 1,
      active: 1,
      pending: 0,
      configuredRevenueShare: 60,
    });
    expect(getCollaborationStats('creator-b').configuredRevenueShare).toBe(40);
    expect(getPublicCollaborations('creator-b')).toHaveLength(1);
    expect(getCollaborationNotifications('user-a')).toMatchObject([
      { title: 'Collaboration accepted', read: false },
    ]);
  });

  it('tracks completion in history and removes it from the public active list', () => {
    const collaboration = invite();
    respondToCollaborationInvite(collaboration.id, 'creator-b', true, fixedDate);

    const completed = endCollaboration(
      collaboration.id,
      'creator-a',
      new Date('2026-09-03T12:00:00.000Z')
    );

    expect(completed.status).toBe('completed');
    expect(completed.endedAt).toBe('2026-09-03T12:00:00.000Z');
    expect(getCollaborationsForCreator('creator-a')).toHaveLength(1);
    expect(getCollaborationStats('creator-a')).toMatchObject({ total: 1, completed: 1, active: 0 });
    expect(getPublicCollaborations('creator-a')).toHaveLength(0);
  });

  it('respects creator consent and guest appearance visibility settings', () => {
    saveCollaborationSettings({
      creatorId: 'creator-b',
      acceptingInvites: false,
      guestAppearancesEnabled: false,
      defaultRevenueShare: 45,
    });

    expect(() => invite()).toThrow('not accepting collaboration invites');
    expect(getCollaborationSettings('creator-b').defaultRevenueShare).toBe(45);
    expect(getPublicCollaborations('creator-b')).toHaveLength(0);
  });

  it('rejects invalid shares, self-invites, duplicate open invites, and unauthorized responses', () => {
    expect(() =>
      createCollaborationInvite({
        inviterId: 'creator-a',
        inviterUserId: 'user-a',
        inviterUsername: 'alpha',
        inviterName: 'Alpha Creator',
        inviteeId: 'creator-b',
        inviteeUserId: 'user-b',
        inviteeUsername: 'beta',
        inviteeName: 'Beta Creator',
        inviterShare: 100,
      })
    ).toThrow('between 1% and 99%');
    expect(() =>
      createCollaborationInvite({
        inviterId: 'creator-a',
        inviterUserId: 'user-a',
        inviterUsername: 'alpha',
        inviterName: 'Alpha Creator',
        inviteeId: 'creator-a',
        inviteeUserId: 'user-a',
        inviteeUsername: 'alpha',
        inviteeName: 'Alpha Creator',
        inviterShare: 50,
      })
    ).toThrow('another creator');

    const collaboration = invite();
    expect(() => invite()).toThrow('already exists');
    expect(() => respondToCollaborationInvite(collaboration.id, 'creator-a', true)).toThrow(
      'no longer available'
    );
  });

  it('marks collaboration notifications as read', () => {
    invite();
    const [notification] = getCollaborationNotifications('user-b');

    markCollaborationNotificationRead(notification.id);

    expect(getCollaborationNotifications('user-b')[0].read).toBe(true);
  });
});