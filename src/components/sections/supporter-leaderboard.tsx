/**
 * Supporter Leaderboard
 * Ranks a creator's supporters by total contribution and shows the loyalty
 * badge each one has earned. Supports limiting the list and filtering to
 * supporters who opted into a public badge profile.
 */

import { Trophy } from 'lucide-react';
import { SupporterBadge } from '@/components/shared/supporter-badge';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { DEFAULT_BADGE_THRESHOLDS, rankSupporters } from '@/lib/loyalty';
import type { BadgeThresholds, SupporterLeaderboardEntry } from '@/types/loyalty';

export interface SupporterLeaderboardProps {
  entries: SupporterLeaderboardEntry[];
  thresholds?: BadgeThresholds;
  /** Only rank supporters who opted into a public badge profile. */
  publicOnly?: boolean;
  /** Maximum number of rows to show. */
  limit?: number;
  title?: string;
  className?: string;
}

export function SupporterLeaderboard({
  entries,
  thresholds = DEFAULT_BADGE_THRESHOLDS,
  publicOnly = false,
  limit,
  title = 'Top supporters',
  className,
}: SupporterLeaderboardProps): JSX.Element {
  const ranked = rankSupporters(entries, thresholds, { publicOnly, limit });

  return (
    <section className={className} aria-label={title} data-testid="supporter-leaderboard">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      {ranked.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed py-10 text-sm text-muted-foreground">
          {publicOnly ? 'No public supporters yet' : 'No supporters to rank yet'}
        </div>
      ) : (
        <ol className="divide-y rounded-lg border" data-testid="supporter-leaderboard-list">
          {ranked.map((supporter) => (
            <li
              key={supporter.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
            >
              <span className="w-8 shrink-0 text-sm font-semibold text-muted-foreground">
                #{supporter.rank}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{supporter.name}</span>
              <SupporterBadge tier={supporter.badgeTier} size="sm" />
              <span className="w-20 shrink-0 text-right text-sm text-muted-foreground">
                {formatNumber(supporter.tipCount, 0)} tips
              </span>
              <span className="w-24 shrink-0 text-right font-semibold">
                {formatCurrency(supporter.totalAmount)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
