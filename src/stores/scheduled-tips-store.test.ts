import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useScheduledTipsStore,
  calculateNextExecutionDate,
  getCountdown,
} from './scheduled-tips-store';

describe('useScheduledTipsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScheduledTipsStore.setState({
      scheduledTips: [],
    });
  });

  describe('calculateNextExecutionDate', () => {
    it('returns null for once frequency', () => {
      expect(calculateNextExecutionDate(new Date('2026-10-01T12:00:00Z'), 'once')).toBeNull();
    });

    it('adds 1 day for daily frequency', () => {
      const next = calculateNextExecutionDate(new Date('2026-10-01T12:00:00Z'), 'daily');
      expect(next).not.toBeNull();
      expect(next?.toISOString()).toBe('2026-10-02T12:00:00.000Z');
    });

    it('adds 7 days for weekly frequency', () => {
      const next = calculateNextExecutionDate(new Date('2026-10-01T12:00:00Z'), 'weekly');
      expect(next).not.toBeNull();
      expect(next?.toISOString()).toBe('2026-10-08T12:00:00.000Z');
    });

    it('adds 1 month for monthly frequency', () => {
      const next = calculateNextExecutionDate(new Date('2026-10-01T12:00:00Z'), 'monthly');
      expect(next).not.toBeNull();
      expect(next?.toISOString()).toBe('2026-11-01T12:00:00.000Z');
    });
  });

  describe('getCountdown', () => {
    it('returns "Due now" when date is in the past', () => {
      const pastDate = new Date(Date.now() - 60000);
      const countdown = getCountdown(pastDate);
      expect(countdown.isOverdue).toBe(true);
      expect(countdown.formatted).toBe('Due now');
    });

    it('formats future countdown properly', () => {
      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000);
      const countdown = getCountdown(futureDate);
      expect(countdown.isOverdue).toBe(false);
      expect(countdown.days).toBe(2);
      expect(countdown.formatted).toContain('2d');
    });
  });

  describe('store actions', () => {
    it('schedules a new tip with pending status', () => {
      const futureDate = new Date('2026-12-25T00:00:00Z');
      const tip = useScheduledTipsStore.getState().scheduleTip({
        creatorId: 'creator-alice',
        amount: 50,
        scheduledDate: futureDate,
        frequency: 'monthly',
        message: 'Happy Holidays!',
      });

      expect(tip.id).toBeDefined();
      expect(tip.status).toBe('pending');
      expect(tip.amount).toBe(50);
      expect(tip.creatorId).toBe('creator-alice');
      expect(tip.frequency).toBe('monthly');
      expect(tip.message).toBe('Happy Holidays!');

      const pending = useScheduledTipsStore.getState().getPendingTips('creator-alice');
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(tip.id);
    });

    it('allows editing a pending scheduled tip', () => {
      const tip = useScheduledTipsStore.getState().scheduleTip({
        creatorId: 'creator-bob',
        amount: 25,
        scheduledDate: new Date('2026-11-01T10:00:00Z'),
        frequency: 'once',
      });

      const updated = useScheduledTipsStore.getState().editScheduledTip(tip.id, {
        amount: 35,
        message: 'Updated birthday tip!',
        frequency: 'weekly',
      });

      expect(updated).toBe(true);
      const edited = useScheduledTipsStore.getState().scheduledTips.find((t) => t.id === tip.id);
      expect(edited?.amount).toBe(35);
      expect(edited?.message).toBe('Updated birthday tip!');
      expect(edited?.frequency).toBe('weekly');
    });

    it('allows cancelling a pending scheduled tip', () => {
      const tip = useScheduledTipsStore.getState().scheduleTip({
        creatorId: 'creator-carol',
        amount: 10,
        scheduledDate: new Date('2026-11-15T10:00:00Z'),
        frequency: 'once',
      });

      const success = useScheduledTipsStore.getState().cancelScheduledTip(tip.id);
      expect(success).toBe(true);

      const cancelled = useScheduledTipsStore.getState().scheduledTips.find((t) => t.id === tip.id);
      expect(cancelled?.status).toBe('cancelled');
      expect(cancelled?.cancelledAt).toBeDefined();

      const pending = useScheduledTipsStore.getState().getPendingTips('creator-carol');
      expect(pending).toHaveLength(0);
    });

    it('executes a one-time tip and marks it executed', async () => {
      const tip = useScheduledTipsStore.getState().scheduleTip({
        creatorId: 'creator-dave',
        amount: 20,
        scheduledDate: new Date('2026-10-10T10:00:00Z'),
        frequency: 'once',
      });

      const success = await useScheduledTipsStore.getState().executeScheduledTip(tip.id);
      expect(success).toBe(true);

      const executed = useScheduledTipsStore.getState().scheduledTips.find((t) => t.id === tip.id);
      expect(executed?.status).toBe('executed');
      expect(executed?.executedAt).toBeDefined();

      // No recurring tip created for 'once'
      const pending = useScheduledTipsStore.getState().getPendingTips('creator-dave');
      expect(pending).toHaveLength(0);
    });

    it('executes a recurring tip and creates the next recurring cycle', async () => {
      const tip = useScheduledTipsStore.getState().scheduleTip({
        creatorId: 'creator-eve',
        amount: 15,
        scheduledDate: new Date('2026-10-01T10:00:00Z'),
        frequency: 'daily',
      });

      const success = await useScheduledTipsStore.getState().executeScheduledTip(tip.id);
      expect(success).toBe(true);

      const executed = useScheduledTipsStore.getState().scheduledTips.find((t) => t.id === tip.id);
      expect(executed?.status).toBe('executed');

      // Next daily recurring tip created!
      const pending = useScheduledTipsStore.getState().getPendingTips('creator-eve');
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('pending');
      expect(pending[0].frequency).toBe('daily');
      expect(pending[0].scheduledDate).toBe('2026-10-02T10:00:00.000Z');
    });

    it('checks and executes due tips automatically', async () => {
      // Past due tip
      const dueTip = useScheduledTipsStore.getState().scheduleTip({
        creatorId: 'creator-due',
        amount: 30,
        scheduledDate: new Date(Date.now() - 5000),
        frequency: 'once',
      });

      // Future tip
      const futureTip = useScheduledTipsStore.getState().scheduleTip({
        creatorId: 'creator-due',
        amount: 50,
        scheduledDate: new Date(Date.now() + 100000),
        frequency: 'once',
      });

      const executedList = await useScheduledTipsStore.getState().checkAndExecuteDueTips();
      expect(executedList).toHaveLength(1);
      expect(executedList[0].id).toBe(dueTip.id);

      const pending = useScheduledTipsStore.getState().getPendingTips('creator-due');
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(futureTip.id);
    });
  });
});
