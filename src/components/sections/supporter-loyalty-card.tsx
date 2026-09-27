'use client';

import { Eye, EyeOff } from 'lucide-react';
import { BadgeProgressCard } from '@/components/sections/badge-progress';
import { useCreatorBadgeThresholds } from '@/hooks/use-badge-thresholds';
import { useSupporterBadgeVisibility } from '@/hooks/use-supporter-loyalty';

export interface SupporterLoyaltyCardProps {
  creatorId: string;
  /** The signed-in supporter, used to persist the opt-in preference. */
  supporterId?: string | null;
  /** The supporter's cumulative spend with this creator. */
  totalSpend: number;
}

/**
 * The supporter's own view of their loyalty status: earned badge, progress to
 * the next tier, and an opt-in toggle for showing the badge publicly.
 */
export function SupporterLoyaltyCard({
  creatorId,
  supporterId,
  totalSpend,
}: SupporterLoyaltyCardProps): JSX.Element {
  const { thresholds } = useCreatorBadgeThresholds(creatorId);
  const { isPublic, setPublic, canOptIn } = useSupporterBadgeVisibility(supporterId);

  return (
    <section className="mt-10 space-y-4" aria-label="Your supporter badge">
      <BadgeProgressCard totalSpend={totalSpend} thresholds={thresholds} />

      <div className="rounded-lg border p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-gray-300"
            checked={isPublic}
            disabled={!canOptIn}
            onChange={(event) => setPublic(event.target.checked)}
            aria-label="Show my badge on the public supporter profile"
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-medium">
              {isPublic ? (
                <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              {isPublic ? 'Your badge is public' : 'Your badge is private'}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {canOptIn
                ? 'When public, this creator can see your badge on their supporter profile and leaderboard.'
                : 'Sign in to save your badge visibility preference.'}
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}
