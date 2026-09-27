/**
 * Supporter Badge
 * Renders a supporter's earned loyalty badge (bronze → platinum).
 */

import { Award, Gem, Medal, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupporterBadgeLevel, SupporterBadgeTier } from '@/types/loyalty';
import { getBadgeTierDefinition } from '@/lib/loyalty';

export interface SupporterBadgeProps {
  tier: SupporterBadgeLevel;
  /** Compact pill for tables, or a larger badge for profile headers. */
  size?: 'sm' | 'md' | 'lg';
  /** Hide the badge entirely when no tier has been earned yet. */
  hideWhenNone?: boolean;
  className?: string;
  title?: string;
}

interface TierStyle {
  classes: string;
  icon: JSX.Element;
}

const ICON_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

function tierStyle(tier: SupporterBadgeTier, size: 'sm' | 'md' | 'lg'): TierStyle {
  const iconClass = ICON_CLASSES[size];

  switch (tier) {
    case 'bronze':
      return {
        classes: 'border-amber-300/40 bg-amber-500/15 text-amber-500',
        icon: <Medal className={iconClass} aria-hidden="true" />,
      };
    case 'silver':
      return {
        classes: 'border-slate-300/40 bg-slate-400/15 text-slate-300',
        icon: <Award className={iconClass} aria-hidden="true" />,
      };
    case 'gold':
      return {
        classes: 'border-yellow-400/40 bg-yellow-400/15 text-yellow-400',
        icon: <Trophy className={iconClass} aria-hidden="true" />,
      };
    case 'platinum':
      return {
        classes: 'border-cyan-300/40 bg-cyan-400/15 text-cyan-300',
        icon: <Gem className={iconClass} aria-hidden="true" />,
      };
  }
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'gap-1 px-2 py-0.5 text-[11px]',
  md: 'gap-1.5 px-2.5 py-1 text-xs',
  lg: 'gap-2 px-3 py-1.5 text-sm',
};

export function SupporterBadge({
  tier,
  size = 'md',
  hideWhenNone = true,
  className,
  title,
}: SupporterBadgeProps): JSX.Element | null {
  if (tier === 'none') {
    if (hideWhenNone) return null;

    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border border-border/60 bg-muted/40 font-semibold text-muted-foreground',
          SIZE_CLASSES[size],
          className
        )}
        data-badge-tier="none"
      >
        <Medal className={ICON_CLASSES[size]} aria-hidden="true" />
        <span>New supporter</span>
      </span>
    );
  }

  const definition = getBadgeTierDefinition(tier);
  const { classes, icon } = tierStyle(tier, size);
  const tooltip = title ?? `${definition.label} supporter — ${definition.description}`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        classes,
        SIZE_CLASSES[size],
        className
      )}
      data-badge-tier={tier}
      title={tooltip}
      aria-label={`${definition.label} supporter badge`}
      role="status"
    >
      {icon}
      <span>{definition.label}</span>
    </span>
  );
}
