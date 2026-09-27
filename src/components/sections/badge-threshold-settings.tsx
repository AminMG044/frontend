'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SupporterBadge } from '@/components/shared/supporter-badge';
import { useCreatorBadgeThresholds } from '@/hooks/use-badge-thresholds';
import { SUPPORTER_BADGE_TIERS, type BadgeThresholds } from '@/types/loyalty';
import { formatCurrency } from '@/utils/formatters';

export interface BadgeThresholdSettingsProps {
  creatorId: string;
}

type ThresholdDraft = Record<keyof BadgeThresholds, string>;

function toDraft(thresholds: BadgeThresholds): ThresholdDraft {
  return {
    bronze: String(thresholds.bronze),
    silver: String(thresholds.silver),
    gold: String(thresholds.gold),
    platinum: String(thresholds.platinum),
  };
}

const TIER_LABELS: Record<keyof BadgeThresholds, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

/**
 * Lets a creator customize the spend thresholds that unlock each supporter
 * badge. Values are normalized so tiers always stay strictly ascending.
 */
export function BadgeThresholdSettings({ creatorId }: BadgeThresholdSettingsProps): JSX.Element {
  const { thresholds, saveThresholds, resetThresholds } = useCreatorBadgeThresholds(creatorId);
  const [draft, setDraft] = useState<ThresholdDraft>(() => toDraft(thresholds));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toDraft(thresholds));
  }, [thresholds]);

  const updateDraft = (tier: keyof BadgeThresholds, value: string): void => {
    setDraft((current) => ({ ...current, [tier]: value }));
    setMessage(null);
  };

  const handleSave = (): void => {
    const saved = saveThresholds({
      bronze: Number(draft.bronze),
      silver: Number(draft.silver),
      gold: Number(draft.gold),
      platinum: Number(draft.platinum),
    });
    setDraft(toDraft(saved));
    setMessage('Badge thresholds saved.');
  };

  const handleReset = (): void => {
    const reset = resetThresholds();
    setDraft(toDraft(reset));
    setMessage('Reset to the default thresholds.');
  };

  return (
    <Card className="mb-6 p-6" data-testid="badge-threshold-settings">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Supporter badges</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set how much a supporter needs to give in total to unlock each badge tier.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SUPPORTER_BADGE_TIERS.map((tier) => (
            <SupporterBadge key={tier} tier={tier} size="sm" />
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUPPORTER_BADGE_TIERS.map((tier) => (
          <label key={tier} className="text-sm font-medium">
            {TIER_LABELS[tier]}
            <input
              aria-label={`${TIER_LABELS[tier]} threshold`}
              inputMode="decimal"
              type="number"
              min={0}
              value={draft[tier]}
              onChange={(event) => updateDraft(tier, event.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 font-normal"
            />
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {formatCurrency(thresholds[tier])} to unlock
            </span>
          </label>
        ))}
      </div>

      {message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          Save thresholds
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Reset to defaults
        </Button>
      </div>
    </Card>
  );
}
