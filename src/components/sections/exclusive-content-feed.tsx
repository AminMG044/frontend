'use client';

import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import {
  useExclusiveContentStore,
  type TierLockedContent,
} from '@/stores/exclusive-content-store';
import { TierLockedContentCard } from './tier-locked-content-card';

export interface ExclusiveContentFeedProps {
  creatorId: string;
  creatorName?: string;
  currentUserId?: string;
  onTipClick?: (amount?: number) => void;
}

export function ExclusiveContentFeed({
  creatorId,
  creatorName = 'Creator',
  currentUserId,
  onTipClick,
}: ExclusiveContentFeedProps): JSX.Element | null {
  const contentList = useExclusiveContentStore((state) =>
    state.getContentForCreator(creatorId)
  );

  if (!contentList || contentList.length === 0) {
    return null;
  }

  const handleUnlock = (content: TierLockedContent) => {
    if (onTipClick) {
      onTipClick(content.requiredAmount);
    }
  };

  return (
    <section className="mb-12 space-y-6" data-testid="exclusive-content-feed">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Exclusive Supporter Content
          </h2>
          <p className="text-sm text-muted-foreground">
            Special posts and rewards reserved for {creatorName}'s top supporters and tippers.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium w-fit flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {contentList.length} Exclusive {contentList.length === 1 ? 'Post' : 'Posts'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {contentList.map((item) => (
          <TierLockedContentCard
            key={item.id}
            content={item}
            currentUserId={currentUserId}
            creatorName={creatorName}
            onUnlockClick={handleUnlock}
          />
        ))}
      </div>
    </section>
  );
}
