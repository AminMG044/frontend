import { beforeEach, describe, expect, it } from 'vitest';
import {
  BADGE_THRESHOLDS_KEY,
  DEFAULT_BADGE_THRESHOLDS,
  SUPPORTER_VISIBILITY_KEY,
  getBadgeProgress,
  getBadgeTierDefinition,
  getCreatorBadgeThresholds,
  getNextBadgeTier,
  getSupporterBadge,
  getSupporterBadgeVisibility,
  normalizeThresholds,
  rankSupporters,
  saveCreatorBadgeThresholds,
  setSupporterBadgeVisibility,
} from './loyalty';
import type { BadgeThresholds } from '@/types/loyalty';

const THRESHOLDS: BadgeThresholds = { bronze: 10, silver: 50, gold: 200, platinum: 500 };

describe('normalizeThresholds', () => {
  it('fills missing tiers with the defaults', () => {
    expect(normalizeThresholds({ bronze: 5 })).toEqual({ ...DEFAULT_BADGE_THRESHOLDS, bronze: 5 });
  });

  it('falls back to defaults for missing or non-positive input', () => {
    expect(normalizeThresholds({ bronze: 0, silver: -3, gold: NaN, platinum: undefined })).toEqual(
      DEFAULT_BADGE_THRESHOLDS
    );
  });

  it('keeps tiers strictly ascending', () => {
    const normalized = normalizeThresholds({ bronze: 100, silver: 50, gold: 10, platinum: 5 });

    expect(normalized.bronze).toBe(100);
    expect(normalized.silver).toBeGreaterThan(normalized.bronze);
    expect(normalized.gold).toBeGreaterThan(normalized.silver);
    expect(normalized.platinum).toBeGreaterThan(normalized.gold);
  });
});

describe('getSupporterBadge', () => {
  it('returns "none" below the first threshold', () => {
    expect(getSupporterBadge(0, THRESHOLDS)).toBe('none');
    expect(getSupporterBadge(9.99, THRESHOLDS)).toBe('none');
  });

  it('resolves each tier at its exact threshold boundary', () => {
    expect(getSupporterBadge(10, THRESHOLDS)).toBe('bronze');
    expect(getSupporterBadge(49.99, THRESHOLDS)).toBe('bronze');
    expect(getSupporterBadge(50, THRESHOLDS)).toBe('silver');
    expect(getSupporterBadge(200, THRESHOLDS)).toBe('gold');
    expect(getSupporterBadge(500, THRESHOLDS)).toBe('platinum');
  });

  it('stays at the top tier above the highest threshold', () => {
    expect(getSupporterBadge(10_000, THRESHOLDS)).toBe('platinum');
  });
});

describe('getNextBadgeTier', () => {
  it('advances through the ladder and stops at platinum', () => {
    expect(getNextBadgeTier('none')).toBe('bronze');
    expect(getNextBadgeTier('bronze')).toBe('silver');
    expect(getNextBadgeTier('silver')).toBe('gold');
    expect(getNextBadgeTier('gold')).toBe('platinum');
    expect(getNextBadgeTier('platinum')).toBeNull();
  });
});

describe('getBadgeProgress', () => {
  it('measures progress from the previous tier threshold', () => {
    const progress = getBadgeProgress(30, THRESHOLDS);

    expect(progress.currentTier).toBe('bronze');
    expect(progress.nextTier).toBe('silver');
    expect(progress.nextThreshold).toBe(50);
    expect(progress.amountToNext).toBe(20);
    // (30 - 10) / (50 - 10) = 0.5
    expect(progress.ratio).toBeCloseTo(0.5);
  });

  it('starts empty right after unlocking a tier', () => {
    const progress = getBadgeProgress(50, THRESHOLDS);
    expect(progress.currentTier).toBe('silver');
    expect(progress.ratio).toBe(0);
    expect(progress.amountToNext).toBe(150);
  });

  it('caps the ratio at 1 and reports no next tier once maxed', () => {
    const progress = getBadgeProgress(500, THRESHOLDS);
    expect(progress.currentTier).toBe('platinum');
    expect(progress.nextTier).toBeNull();
    expect(progress.nextThreshold).toBeNull();
    expect(progress.amountToNext).toBe(0);
    expect(progress.ratio).toBe(1);
  });
});

describe('rankSupporters', () => {
  const entries = [
    { id: 'a', name: 'Alice', totalAmount: 30, tipCount: 3 },
    { id: 'b', name: 'Bob', totalAmount: 600, tipCount: 12, isPublic: true },
    { id: 'c', name: 'Carol', totalAmount: 100, tipCount: 5, isPublic: true },
  ];

  it('sorts by total amount descending and assigns ranks', () => {
    const ranked = rankSupporters(entries, THRESHOLDS);

    expect(ranked.map((entry) => entry.name)).toEqual(['Bob', 'Carol', 'Alice']);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
    expect(ranked.map((entry) => entry.badgeTier)).toEqual(['platinum', 'silver', 'bronze']);
  });

  it('filters to opted-in supporters when publicOnly is set', () => {
    const ranked = rankSupporters(entries, THRESHOLDS, { publicOnly: true });
    expect(ranked.map((entry) => entry.id)).toEqual(['b', 'c']);
  });

  it('honours the limit option', () => {
    const ranked = rankSupporters(entries, THRESHOLDS, { limit: 2 });
    expect(ranked).toHaveLength(2);
    expect(ranked[0].name).toBe('Bob');
  });
});

describe('getBadgeTierDefinition', () => {
  it('returns metadata for each tier', () => {
    expect(getBadgeTierDefinition('gold').label).toBe('Gold');
    expect(getBadgeTierDefinition('platinum').defaultThreshold).toBe(500);
  });
});

describe('creator threshold persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the defaults when nothing has been stored', () => {
    expect(getCreatorBadgeThresholds('creator-1')).toEqual(DEFAULT_BADGE_THRESHOLDS);
  });

  it('persists normalized thresholds per creator', () => {
    saveCreatorBadgeThresholds('creator-1', { bronze: 25, silver: 5, gold: 100, platinum: 400 });
    saveCreatorBadgeThresholds('creator-2', { bronze: 1, silver: 2, gold: 3, platinum: 4 });

    const creatorOne = getCreatorBadgeThresholds('creator-1');
    expect(creatorOne.bronze).toBe(25);
    expect(creatorOne.silver).toBeGreaterThan(creatorOne.bronze);
    expect(getCreatorBadgeThresholds('creator-2').bronze).toBe(1);
    expect(localStorage.getItem(BADGE_THRESHOLDS_KEY)).toContain('creator-1');
  });
});

describe('supporter badge visibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to private', () => {
    expect(getSupporterBadgeVisibility('user-1')).toBe(false);
  });

  it('persists an opt-in', () => {
    setSupporterBadgeVisibility('user-1', true);
    expect(getSupporterBadgeVisibility('user-1')).toBe(true);
    expect(localStorage.getItem(SUPPORTER_VISIBILITY_KEY)).toContain('user-1');

    setSupporterBadgeVisibility('user-1', false);
    expect(getSupporterBadgeVisibility('user-1')).toBe(false);
  });
});
