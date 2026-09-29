/**
 * Scheduled Tips Store
 * Manages future and recurring scheduled tips with persistence, execution, and countdowns
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ScheduledTip, ScheduledTipFrequency } from '@/types';
import { useAppStore } from './app-store';

export interface ScheduleTipPayload {
  creatorId: string;
  creatorName?: string;
  amount: number;
  scheduledDate: string | Date;
  frequency?: ScheduledTipFrequency;
  walletId?: string;
  message?: string;
}

export interface EditScheduledTipPayload {
  amount?: number;
  scheduledDate?: string | Date;
  frequency?: ScheduledTipFrequency;
  message?: string;
}

export interface CountdownInfo {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  formatted: string;
}

/**
 * Calculates the next execution date based on recurring frequency
 */
export function calculateNextExecutionDate(
  baseDate: Date | string,
  frequency: ScheduledTipFrequency
): Date | null {
  if (frequency === 'once') return null;

  const next = new Date(baseDate);
  if (isNaN(next.getTime())) return null;

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return null;
  }
  return next;
}

/**
 * Calculates human-readable countdown to target scheduled date
 */
export function getCountdown(targetDate: Date | string): CountdownInfo {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (isNaN(target)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isOverdue: true,
      formatted: 'Invalid date',
    };
  }

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isOverdue: true,
      formatted: 'Due now',
    };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    isOverdue: false,
    formatted,
  };
}

export interface ScheduledTipsStore {
  scheduledTips: ScheduledTip[];

  scheduleTip: (payload: ScheduleTipPayload) => ScheduledTip;
  editScheduledTip: (id: string, updates: EditScheduledTipPayload) => boolean;
  cancelScheduledTip: (id: string) => boolean;
  executeScheduledTip: (id: string) => Promise<boolean>;
  checkAndExecuteDueTips: () => Promise<ScheduledTip[]>;
  getScheduledTipsByCreator: (creatorId: string) => ScheduledTip[];
  getPendingTips: (creatorId?: string) => ScheduledTip[];
}

export const useScheduledTipsStore = create<ScheduledTipsStore>()(
  persist(
    (set, get) => ({
      scheduledTips: [],

      scheduleTip: (payload: ScheduleTipPayload): ScheduledTip => {
        const scheduledDateObj =
          typeof payload.scheduledDate === 'string'
            ? new Date(payload.scheduledDate)
            : payload.scheduledDate;

        const newTip: ScheduledTip = {
          id: `sched-tip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          creatorId: payload.creatorId,
          creatorName: payload.creatorName,
          amount: payload.amount,
          walletId: payload.walletId,
          message: payload.message,
          scheduledDate: scheduledDateObj.toISOString(),
          frequency: payload.frequency || 'once',
          status: 'pending',
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          scheduledTips: [newTip, ...state.scheduledTips],
        }));

        return newTip;
      },

      editScheduledTip: (id: string, updates: EditScheduledTipPayload): boolean => {
        const state = get();
        const tip = state.scheduledTips.find((t) => t.id === id);
        if (!tip || tip.status !== 'pending') {
          return false;
        }

        const scheduledDateStr = updates.scheduledDate
          ? (typeof updates.scheduledDate === 'string'
              ? new Date(updates.scheduledDate)
              : updates.scheduledDate
            ).toISOString()
          : tip.scheduledDate;

        set((s) => ({
          scheduledTips: s.scheduledTips.map((t) =>
            t.id === id
              ? {
                  ...t,
                  amount: updates.amount ?? t.amount,
                  scheduledDate: scheduledDateStr,
                  frequency: updates.frequency ?? t.frequency,
                  message: updates.message !== undefined ? updates.message : t.message,
                }
              : t
          ),
        }));

        return true;
      },

      cancelScheduledTip: (id: string): boolean => {
        const state = get();
        const tip = state.scheduledTips.find((t) => t.id === id);
        if (!tip || tip.status !== 'pending') {
          return false;
        }

        set((s) => ({
          scheduledTips: s.scheduledTips.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'cancelled',
                  cancelledAt: new Date().toISOString(),
                }
              : t
          ),
        }));

        return true;
      },

      executeScheduledTip: async (id: string): Promise<boolean> => {
        const state = get();
        const tip = state.scheduledTips.find((t) => t.id === id);
        if (!tip || tip.status !== 'pending') {
          return false;
        }

        const executedAt = new Date().toISOString();

        // Check if recurring: if so, compute next execution date and create next pending tip
        let nextRecurringTip: ScheduledTip | null = null;
        if (tip.frequency !== 'once') {
          const nextDate = calculateNextExecutionDate(tip.scheduledDate, tip.frequency);
          if (nextDate) {
            nextRecurringTip = {
              id: `sched-tip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              creatorId: tip.creatorId,
              creatorName: tip.creatorName,
              amount: tip.amount,
              walletId: tip.walletId,
              message: tip.message,
              scheduledDate: nextDate.toISOString(),
              frequency: tip.frequency,
              status: 'pending',
              createdAt: executedAt,
            };
          }
        }

        set((s) => {
          const updated = s.scheduledTips.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: 'executed' as const,
                  executedAt,
                }
              : t
          );
          return {
            scheduledTips: nextRecurringTip ? [nextRecurringTip, ...updated] : updated,
          };
        });

        // Trigger notification
        try {
          useAppStore.getState().addNotification({
            type: 'success',
            title: 'Scheduled Tip Processed',
            message: `Scheduled tip of $${tip.amount} for @${tip.creatorId} has executed successfully!`,
          });
        } catch {
          // Ignore if notification store not hydrated
        }

        return true;
      },

      checkAndExecuteDueTips: async (): Promise<ScheduledTip[]> => {
        const state = get();
        const now = new Date().getTime();
        const dueTips = state.scheduledTips.filter(
          (t) => t.status === 'pending' && new Date(t.scheduledDate).getTime() <= now
        );

        for (const tip of dueTips) {
          await get().executeScheduledTip(tip.id);
        }

        return dueTips;
      },

      getScheduledTipsByCreator: (creatorId: string): ScheduledTip[] => {
        const state = get();
        return state.scheduledTips.filter((t) => t.creatorId === creatorId);
      },

      getPendingTips: (creatorId?: string): ScheduledTip[] => {
        const state = get();
        return state.scheduledTips
          .filter(
            (t) =>
              t.status === 'pending' && (!creatorId || t.creatorId === creatorId)
          )
          .sort(
            (a, b) =>
              new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
          );
      },
    }),
    {
      name: 'dorisio-scheduled-tips',
    }
  )
);
