/**
 * Supporter Loyalty Types
 *
 * Shared shapes for the supporter badge / loyalty system. Badge tiers are
 * earned from a supporter's cumulative spend with a creator and are shown on
 * the creator's top-supporter leaderboard and (when the supporter opts in) on
 * the supporter's public profile.
 */

/** Ordered badge tiers from lowest to highest. `none` means no badge earned yet. */
export const SUPPORTER_BADGE_TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;

export type SupporterBadgeTier = (typeof SUPPORTER_BADGE_TIERS)[number];

/** A badge tier or the absence of one. */
export type SupporterBadgeLevel = SupporterBadgeTier | 'none';

/**
 * Per-creator spend thresholds (in USDC) that unlock each badge tier.
 * A creator can customize these; values are always normalized to be positive
 * and strictly ascending.
 */
export interface BadgeThresholds {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

/** Static display metadata for a badge tier. */
export interface BadgeTierDefinition {
  tier: SupporterBadgeTier;
  label: string;
  description: string;
  /** Default spend threshold used when a creator has not customized it. */
  defaultThreshold: number;
}

/** Progress from a supporter's current badge toward the next one. */
export interface BadgeProgress {
  /** The badge the supporter currently holds. */
  currentTier: SupporterBadgeLevel;
  /** The next badge to earn, or `null` when the top tier is reached. */
  nextTier: SupporterBadgeTier | null;
  /** Spend required to unlock `nextTier`, or the top threshold when maxed. */
  nextThreshold: number | null;
  /** Amount still needed to reach `nextTier` (0 once maxed). */
  amountToNext: number;
  /** Completion ratio toward the next tier in the range [0, 1]. */
  ratio: number;
}

/** A supporter row rendered on a creator's leaderboard. */
export interface SupporterLeaderboardEntry {
  id: string;
  name: string;
  totalAmount: number;
  tipCount: number;
  /** Whether this supporter has opted in to a public badge profile. */
  isPublic?: boolean;
}

/** A leaderboard entry enriched with its earned badge and rank. */
export interface RankedSupporter extends SupporterLeaderboardEntry {
  rank: number;
  badgeTier: SupporterBadgeLevel;
  progress: BadgeProgress;
}
