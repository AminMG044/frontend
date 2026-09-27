/**
 * Supporter Loyalty System
 *
 * Pure, framework-free logic for the supporter badge / loyalty system:
 * tier resolution from cumulative spend, per-creator configurable thresholds,
 * progress toward the next tier, and leaderboard ranking.
 *
 * The frontend stays "dumb": this module only derives display state from
 * numbers it is given. Nothing here talks to the network.
 */

import {
  SUPPORTER_BADGE_TIERS,
  type BadgeProgress,
  type BadgeThresholds,
  type BadgeTierDefinition,
  type RankedSupporter,
  type SupporterBadgeLevel,
  type SupporterBadgeTier,
  type SupporterLeaderboardEntry,
} from '@/types/loyalty';
import { readStoredValue, writeStoredValue } from '@/lib/subscriptions';

export const BADGE_THRESHOLDS_KEY = 'dorisio:badge-thresholds';
export const SUPPORTER_VISIBILITY_KEY = 'dorisio:supporter-badge-visibility';

/**
 * Default spend thresholds (USDC) for each tier. Chosen so the "bronze" badge
 * is reachable after a first meaningful tip, while platinum represents a
 * sustained, high-value supporter.
 */
export const DEFAULT_BADGE_THRESHOLDS: BadgeThresholds = {
  bronze: 10,
  silver: 50,
  gold: 200,
  platinum: 500,
};

/** Display metadata for every tier, in ascending order. */
export const BADGE_TIER_DEFINITIONS: BadgeTierDefinition[] = [
  {
    tier: 'bronze',
    label: 'Bronze',
    description: 'Getting started — thank you for your support.',
    defaultThreshold: DEFAULT_BADGE_THRESHOLDS.bronze,
  },
  {
    tier: 'silver',
    label: 'Silver',
    description: 'A regular supporter who keeps coming back.',
    defaultThreshold: DEFAULT_BADGE_THRESHOLDS.silver,
  },
  {
    tier: 'gold',
    label: 'Gold',
    description: 'One of this creator’s most loyal supporters.',
    defaultThreshold: DEFAULT_BADGE_THRESHOLDS.gold,
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    description: 'A top-tier champion of this creator.',
    defaultThreshold: DEFAULT_BADGE_THRESHOLDS.platinum,
  },
];

/** Look up a tier's display metadata. */
export function getBadgeTierDefinition(tier: SupporterBadgeTier): BadgeTierDefinition {
  return BADGE_TIER_DEFINITIONS.find((definition) => definition.tier === tier) as BadgeTierDefinition;
}

/**
 * Coerce arbitrary/partial threshold input into a valid configuration:
 * every tier present, positive, and strictly ascending. Invalid or missing
 * values fall back to the defaults so callers can safely pass user input.
 */
export function normalizeThresholds(input?: Partial<BadgeThresholds> | null): BadgeThresholds {
  const normalized = { ...DEFAULT_BADGE_THRESHOLDS };

  for (const tier of SUPPORTER_BADGE_TIERS) {
    const candidate = Number(input?.[tier]);
    const value = Number.isFinite(candidate) && candidate > 0 ? candidate : DEFAULT_BADGE_THRESHOLDS[tier];
    // Keep each tier strictly above the previous one so a creator can never
    // invert the ordering (e.g. gold cheaper than silver).
    const previousTier = SUPPORTER_BADGE_TIERS[SUPPORTER_BADGE_TIERS.indexOf(tier) - 1];
    const floor = previousTier ? normalized[previousTier] + 1 : value;
    normalized[tier] = Math.max(value, floor);
  }

  return normalized;
}

/** Resolve the badge a supporter has earned given their cumulative spend. */
export function getSupporterBadge(
  totalSpend: number,
  thresholds: BadgeThresholds = DEFAULT_BADGE_THRESHOLDS
): SupporterBadgeLevel {
  const spend = Number.isFinite(totalSpend) ? totalSpend : 0;
  const normalized = normalizeThresholds(thresholds);

  for (let index = SUPPORTER_BADGE_TIERS.length - 1; index >= 0; index--) {
    const tier = SUPPORTER_BADGE_TIERS[index];
    if (spend >= normalized[tier]) return tier;
  }

  return 'none';
}

/** Return the tier immediately above the given one, or `null` at the top. */
export function getNextBadgeTier(tier: SupporterBadgeLevel): SupporterBadgeTier | null {
  if (tier === 'none') return 'bronze';
  const index = SUPPORTER_BADGE_TIERS.indexOf(tier);
  return SUPPORTER_BADGE_TIERS[index + 1] ?? null;
}

/**
 * Compute a supporter's progress toward their next badge. The ratio is
 * measured from the current tier's threshold up to the next tier's threshold,
 * so the bar starts empty the moment a tier is unlocked.
 */
export function getBadgeProgress(
  totalSpend: number,
  thresholds: BadgeThresholds = DEFAULT_BADGE_THRESHOLDS
): BadgeProgress {
  const normalized = normalizeThresholds(thresholds);
  const spend = Number.isFinite(totalSpend) ? Math.max(0, totalSpend) : 0;
  const currentTier = getSupporterBadge(spend, normalized);
  const nextTier = getNextBadgeTier(currentTier);

  if (!nextTier) {
    return { currentTier, nextTier: null, nextThreshold: null, amountToNext: 0, ratio: 1 };
  }

  const nextThreshold = normalized[nextTier];
  const previousThreshold = currentTier === 'none' ? 0 : normalized[currentTier];
  const span = nextThreshold - previousThreshold;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (spend - previousThreshold) / span)) : 0;

  return {
    currentTier,
    nextTier,
    nextThreshold,
    amountToNext: Math.max(0, nextThreshold - spend),
    ratio,
  };
}

export interface RankSupportersOptions {
  /** When true, only supporters who opted into a public badge profile are ranked. */
  publicOnly?: boolean;
  /** Number of entries to keep after sorting. */
  limit?: number;
}

/**
 * Rank supporters by total contribution, attach their badge + progress, and
 * optionally filter to supporters who made their badge profile public.
 */
export function rankSupporters(
  entries: SupporterLeaderboardEntry[],
  thresholds: BadgeThresholds = DEFAULT_BADGE_THRESHOLDS,
  options: RankSupportersOptions = {}
): RankedSupporter[] {
  const { publicOnly = false, limit } = options;
  const normalized = normalizeThresholds(thresholds);

  const ranked = entries
    .filter((entry) => !publicOnly || entry.isPublic === true)
    .slice()
    .sort((a, b) => b.totalAmount - a.totalAmount || a.name.localeCompare(b.name))
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      badgeTier: getSupporterBadge(entry.totalAmount, normalized),
      progress: getBadgeProgress(entry.totalAmount, normalized),
    }));

  return typeof limit === 'number' ? ranked.slice(0, limit) : ranked;
}

// ---------------------------------------------------------------------------
// Per-creator threshold configuration (client-side, local persistence)
// ---------------------------------------------------------------------------

type ThresholdStore = Record<string, BadgeThresholds>;

function readThresholdStore(): ThresholdStore {
  return readStoredValue<ThresholdStore>(BADGE_THRESHOLDS_KEY, {});
}

/** Read a creator's configured badge thresholds, falling back to defaults. */
export function getCreatorBadgeThresholds(
  creatorId: string | null | undefined,
  fallback: BadgeThresholds = DEFAULT_BADGE_THRESHOLDS
): BadgeThresholds {
  if (!creatorId) return normalizeThresholds(fallback);
  const stored = readThresholdStore()[creatorId];
  return stored ? normalizeThresholds(stored) : normalizeThresholds(fallback);
}

/** Persist a creator's badge thresholds. */
export function saveCreatorBadgeThresholds(
  creatorId: string,
  thresholds: Partial<BadgeThresholds>
): BadgeThresholds {
  const normalized = normalizeThresholds(thresholds);
  writeStoredValue(BADGE_THRESHOLDS_KEY, { ...readThresholdStore(), [creatorId]: normalized });
  return normalized;
}

// ---------------------------------------------------------------------------
// Supporter public-profile opt-in (client-side, local persistence)
// ---------------------------------------------------------------------------

type VisibilityStore = Record<string, boolean>;

/** Whether a supporter has opted in to a public badge profile. Defaults off. */
export function getSupporterBadgeVisibility(supporterId: string | null | undefined): boolean {
  if (!supporterId) return false;
  return readStoredValue<VisibilityStore>(SUPPORTER_VISIBILITY_KEY, {})[supporterId] === true;
}

/** Opt a supporter in or out of a public badge profile. */
export function setSupporterBadgeVisibility(supporterId: string, visible: boolean): void {
  const store = readStoredValue<VisibilityStore>(SUPPORTER_VISIBILITY_KEY, {});
  writeStoredValue(SUPPORTER_VISIBILITY_KEY, { ...store, [supporterId]: visible });
}
