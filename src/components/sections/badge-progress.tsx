/**
 * Badge Progress
 * Shows a supporter's current loyalty badge and how far they are from the
 * next tier, so supporters have a visible path to level up.
 */

import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SupporterBadge } from '@/components/shared/supporter-badge';
import { formatCurrency } from '@/utils/formatters';
import {
  DEFAULT_BADGE_THRESHOLDS,
  getBadgeProgress,
  getBadgeTierDefinition,
} from '@/lib/loyalty';
import type { BadgeThresholds } from '@/types/loyalty';

export interface BadgeProgressCardProps {
  /** The supporter's cumulative spend with this creator. */
  totalSpend: number;
  thresholds?: BadgeThresholds;
  className?: string;
}

export function BadgeProgressCard({
  totalSpend,
  thresholds = DEFAULT_BADGE_THRESHOLDS,
  className,
}: BadgeProgressCardProps): JSX.Element {
  const progress = getBadgeProgress(totalSpend, thresholds);
  const percent = Math.round(progress.ratio * 100);
  const nextDefinition = progress.nextTier ? getBadgeTierDefinition(progress.nextTier) : null;

  return (
    <Card className={className} data-testid="badge-progress-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Supporter level</p>
          <p className="mt-1 text-2xl font-bold">{formatCurrency(totalSpend)}</p>
        </div>
        <SupporterBadge tier={progress.currentTier} size="lg" hideWhenNone={false} />
      </div>

      <div className="mt-5 space-y-2">
        {nextDefinition ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                Next: {nextDefinition.label}
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(progress.amountToNext)} to go
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`Progress to ${nextDefinition.label} badge`}
              className="h-2 w-full overflow-hidden rounded-full bg-muted/40"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Reach {formatCurrency(progress.nextThreshold ?? 0)} in total support to unlock{' '}
              {nextDefinition.label}.
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-primary">
            Top tier reached — you are a platinum supporter. Thank you!
          </p>
        )}
      </div>
    </Card>
  );
}
