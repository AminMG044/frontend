'use client';

import React from 'react';
import { Lock, Unlock, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  type TierLockedContent,
  useExclusiveContentStore,
} from '@/stores/exclusive-content-store';

export interface TierLockedContentCardProps {
  content: TierLockedContent;
  currentUserId?: string;
  creatorName?: string;
  onUnlockClick?: (content: TierLockedContent) => void;
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-600/15 text-amber-600 border-amber-600/30',
  silver: 'bg-slate-400/20 text-slate-300 border-slate-400/30',
  gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  platinum: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  free: 'bg-muted text-muted-foreground',
};

export function TierLockedContentCard({
  content,
  currentUserId,
  creatorName = 'Creator',
  onUnlockClick,
}: TierLockedContentCardProps): JSX.Element {
  const isUnlocked = useExclusiveContentStore((state) =>
    state.isContentUnlocked(content.creatorId, currentUserId, content)
  );
  const supporterStatus = useExclusiveContentStore((state) =>
    state.getSupporterStatus(content.creatorId, currentUserId)
  );

  const amountNeeded = Math.max(0, content.requiredAmount - supporterStatus.cumulativeTipped);

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 ${
        isUnlocked
          ? 'border-border/80 bg-card/60 shadow-sm'
          : 'border-dashed border-primary/40 bg-card/30'
      }`}
      data-testid={`exclusive-card-${content.id}`}
      aria-label={`Exclusive content: ${content.title}`}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={`capitalize font-medium text-xs tracking-wider px-2.5 py-0.5 ${
              TIER_COLORS[content.requiredTier] || TIER_COLORS.free
            }`}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {content.requiredTier} Tier (${content.requiredAmount}+)
          </Badge>

          {isUnlocked ? (
            <span
              className="inline-flex items-center text-xs font-medium text-emerald-400 gap-1"
              data-testid="unlocked-badge"
            >
              <Unlock className="h-3.5 w-3.5" />
              Unlocked
            </span>
          ) : (
            <span
              className="inline-flex items-center text-xs font-medium text-amber-400/90 gap-1"
              data-testid="locked-badge"
            >
              <Lock className="h-3.5 w-3.5" />
              Locked
            </span>
          )}
        </div>

        <CardTitle className="text-lg font-semibold mt-2 leading-tight">
          {content.title}
        </CardTitle>
        {content.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {content.description}
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isUnlocked ? (
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed p-4 rounded-lg bg-background/50 border border-border/40"
            data-testid="exclusive-content-body"
          >
            {content.content}
          </div>
        ) : (
          <div className="relative rounded-lg p-5 bg-background/40 border border-border/30 overflow-hidden text-center">
            {/* Blurred Teaser Preview */}
            <div className="select-none blur-sm opacity-40 pointer-events-none mb-3 text-sm text-foreground">
              {content.previewSnippet ||
                'This exclusive post is reserved for supporters. Unlock to reveal full high-res content, download links, and behind-the-scenes insights.'}
            </div>

            {/* Lock Overlay */}
            <div className="flex flex-col items-center justify-center p-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Lock className="h-5 w-5" />
              </div>
              <h4 className="font-medium text-sm text-foreground mb-1">
                Supporter-Only Content
              </h4>
              <p className="text-xs text-muted-foreground max-w-xs mb-3">
                Tip at least <span className="font-semibold text-foreground">${content.requiredAmount}</span> or reach{' '}
                <span className="capitalize font-semibold text-foreground">{content.requiredTier} tier</span> to unlock permanently.
              </p>

              {amountNeeded > 0 && supporterStatus.cumulativeTipped > 0 && (
                <p className="text-xs text-primary mb-2 font-medium">
                  You already contributed ${supporterStatus.cumulativeTipped}. Tip ${amountNeeded} more to unlock!
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {!isUnlocked && (
        <CardFooter className="pt-0 flex flex-col sm:flex-row gap-2 items-center justify-between">
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Supports {creatorName} & unlocks instant access
          </p>
          <Button
            size="sm"
            onClick={() => onUnlockClick?.(content)}
            className="w-full sm:w-auto font-medium"
            data-testid={`unlock-button-${content.id}`}
          >
            <Lock className="mr-1.5 h-3.5 w-3.5" />
            Unlock for ${content.requiredAmount}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
