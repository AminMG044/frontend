/**
 * Exclusive Content & Tier-Locked Tips Store
 *
 * Manages creator exclusive content items, required tip tiers/thresholds,
 * supporter unlock statuses, and permanent localStorage persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SupporterTierLevel = 'free' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface TierLockedContent {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  content: string;
  previewSnippet?: string;
  requiredTier: SupporterTierLevel;
  requiredAmount: number;
  createdAt: string;
  mediaUrl?: string;
  mediaType?: 'text' | 'image' | 'video' | 'audio' | 'link';
}

export interface SupporterTierStatus {
  creatorId: string;
  supporterId: string;
  currentTier: SupporterTierLevel;
  cumulativeTipped: number;
  unlockedContentIds: string[];
  lastTippedAt?: string;
}

export interface ExclusiveContentStore {
  /** Exclusive content by creator ID */
  contentByCreator: Record<string, TierLockedContent[]>;
  /** Supporter tier and unlock progress by `${creatorId}:${supporterId}` */
  supporterTiers: Record<string, SupporterTierStatus>;

  // Creator Content Management
  addContent: (creatorId: string, content: Omit<TierLockedContent, 'id' | 'createdAt' | 'creatorId'>) => TierLockedContent;
  updateContent: (creatorId: string, contentId: string, updates: Partial<TierLockedContent>) => void;
  deleteContent: (creatorId: string, contentId: string) => void;
  getContentForCreator: (creatorId: string) => TierLockedContent[];

  // Supporter Unlocking & Tier Tracking
  recordSupporterTip: (creatorId: string, supporterId: string, amount: number) => SupporterTierStatus;
  unlockContent: (creatorId: string, supporterId: string, contentId: string) => void;
  isContentUnlocked: (creatorId: string, supporterId: string | undefined, content: TierLockedContent) => boolean;
  getSupporterStatus: (creatorId: string, supporterId: string | undefined) => SupporterTierStatus;
  resetSupporterStatus: (creatorId: string, supporterId: string) => void;
}

export const DEFAULT_TIER_THRESHOLDS: Record<SupporterTierLevel, number> = {
  free: 0,
  bronze: 5,
  silver: 15,
  gold: 30,
  platinum: 50,
};

export function resolveTierLevel(amount: number): SupporterTierLevel {
  if (amount >= DEFAULT_TIER_THRESHOLDS.platinum) return 'platinum';
  if (amount >= DEFAULT_TIER_THRESHOLDS.gold) return 'gold';
  if (amount >= DEFAULT_TIER_THRESHOLDS.silver) return 'silver';
  if (amount >= DEFAULT_TIER_THRESHOLDS.bronze) return 'bronze';
  return 'free';
}

export const useExclusiveContentStore = create<ExclusiveContentStore>()(
  persist(
    (set, get) => ({
      contentByCreator: {},
      supporterTiers: {},

      addContent: (creatorId, contentData) => {
        const id = `content_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newContent: TierLockedContent = {
          ...contentData,
          id,
          creatorId,
          createdAt: new Date().toISOString(),
        };

        set((state) => {
          const existing = state.contentByCreator[creatorId] || [];
          return {
            contentByCreator: {
              ...state.contentByCreator,
              [creatorId]: [newContent, ...existing],
            },
          };
        });

        return newContent;
      },

      updateContent: (creatorId, contentId, updates) => {
        set((state) => {
          const list = state.contentByCreator[creatorId] || [];
          const updated = list.map((item) =>
            item.id === contentId ? { ...item, ...updates } : item
          );
          return {
            contentByCreator: {
              ...state.contentByCreator,
              [creatorId]: updated,
            },
          };
        });
      },

      deleteContent: (creatorId, contentId) => {
        set((state) => {
          const list = state.contentByCreator[creatorId] || [];
          return {
            contentByCreator: {
              ...state.contentByCreator,
              [creatorId]: list.filter((item) => item.id !== contentId),
            },
          };
        });
      },

      getContentForCreator: (creatorId) => {
        return get().contentByCreator[creatorId] || [];
      },

      recordSupporterTip: (creatorId, supporterId, amount) => {
        const key = `${creatorId}:${supporterId}`;
        const current = get().supporterTiers[key] || {
          creatorId,
          supporterId,
          currentTier: 'free',
          cumulativeTipped: 0,
          unlockedContentIds: [],
        };

        const newCumulative = current.cumulativeTipped + amount;
        const newTier = resolveTierLevel(newCumulative);

        // Auto unlock all contents for this creator where requiredAmount <= newCumulative
        const creatorContent = get().contentByCreator[creatorId] || [];
        const eligibleUnlocked = creatorContent
          .filter((item) => item.requiredAmount <= newCumulative)
          .map((item) => item.id);

        const mergedUnlocked = Array.from(
          new Set([...current.unlockedContentIds, ...eligibleUnlocked])
        );

        const updatedStatus: SupporterTierStatus = {
          ...current,
          currentTier: newTier,
          cumulativeTipped: newCumulative,
          unlockedContentIds: mergedUnlocked,
          lastTippedAt: new Date().toISOString(),
        };

        set((state) => ({
          supporterTiers: {
            ...state.supporterTiers,
            [key]: updatedStatus,
          },
        }));

        return updatedStatus;
      },

      unlockContent: (creatorId, supporterId, contentId) => {
        const key = `${creatorId}:${supporterId}`;
        set((state) => {
          const current = state.supporterTiers[key] || {
            creatorId,
            supporterId,
            currentTier: 'free',
            cumulativeTipped: 0,
            unlockedContentIds: [],
          };

          if (current.unlockedContentIds.includes(contentId)) {
            return state;
          }

          return {
            supporterTiers: {
              ...state.supporterTiers,
              [key]: {
                ...current,
                unlockedContentIds: [...current.unlockedContentIds, contentId],
              },
            },
          };
        });
      },

      isContentUnlocked: (creatorId, supporterId, content) => {
        if (!supporterId) return false;
        // Creator viewing their own content is always unlocked
        if (supporterId === creatorId) return true;

        const key = `${creatorId}:${supporterId}`;
        const status = get().supporterTiers[key];
        if (!status) return false;

        // Check explicit unlock or cumulative tipped meets threshold
        return (
          status.unlockedContentIds.includes(content.id) ||
          status.cumulativeTipped >= content.requiredAmount
        );
      },

      getSupporterStatus: (creatorId, supporterId) => {
        if (!supporterId) {
          return {
            creatorId,
            supporterId: '',
            currentTier: 'free',
            cumulativeTipped: 0,
            unlockedContentIds: [],
          };
        }
        const key = `${creatorId}:${supporterId}`;
        return (
          get().supporterTiers[key] || {
            creatorId,
            supporterId,
            currentTier: 'free',
            cumulativeTipped: 0,
            unlockedContentIds: [],
          }
        );
      },

      resetSupporterStatus: (creatorId, supporterId) => {
        const key = `${creatorId}:${supporterId}`;
        set((state) => {
          const next = { ...state.supporterTiers };
          delete next[key];
          return { supporterTiers: next };
        });
      },
    }),
    {
      name: 'dorisio-exclusive-content-storage',
    }
  )
);
