import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TierLockedContentCard } from './tier-locked-content-card';
import {
  useExclusiveContentStore,
  type TierLockedContent,
} from '@/stores/exclusive-content-store';

describe('TierLockedContentCard', () => {
  const mockContent: TierLockedContent = {
    id: 'test_card_1',
    creatorId: 'creator_1',
    title: 'Exclusive Video Tutorial',
    description: 'Learn advanced Stellar smart contracts',
    content: 'FULL_SECRET_CONTENT_BODY_HERE',
    previewSnippet: 'Learn the secrets of smart contracts...',
    requiredTier: 'silver',
    requiredAmount: 15,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    localStorage.clear();
    useExclusiveContentStore.setState({
      contentByCreator: {
        creator_1: [mockContent],
      },
      supporterTiers: {},
    });
  });

  it('renders locked state when user has not reached required tier', () => {
    const handleUnlock = vi.fn();

    render(
      <TierLockedContentCard
        content={mockContent}
        currentUserId="user_guest"
        creatorName="Alice"
        onUnlockClick={handleUnlock}
      />
    );

    // Title and badge
    expect(screen.getByText('Exclusive Video Tutorial')).toBeInTheDocument();
    expect(screen.getByTestId('locked-badge')).toHaveTextContent('Locked');
    expect(screen.getAllByText(/silver/i).length).toBeGreaterThanOrEqual(1);

    // Lock overlay and teaser
    expect(screen.getByText('Supporter-Only Content')).toBeInTheDocument();
    expect(screen.getByText(/Tip at least/i)).toBeInTheDocument();

    // Full secret content should NOT be rendered
    expect(screen.queryByText('FULL_SECRET_CONTENT_BODY_HERE')).toBeNull();

    // Unlock button
    const unlockBtn = screen.getByTestId('unlock-button-test_card_1');
    expect(unlockBtn).toHaveTextContent('Unlock for $15');

    fireEvent.click(unlockBtn);
    expect(handleUnlock).toHaveBeenCalledWith(mockContent);
  });

  it('renders unlocked state when user has reached required tier', () => {
    // Supporter tipped $20 (exceeds $15 silver requirement)
    useExclusiveContentStore.getState().recordSupporterTip('creator_1', 'user_vip', 20);

    render(
      <TierLockedContentCard
        content={mockContent}
        currentUserId="user_vip"
        creatorName="Alice"
      />
    );

    expect(screen.getByTestId('unlocked-badge')).toHaveTextContent('Unlocked');
    expect(screen.getByTestId('exclusive-content-body')).toHaveTextContent(
      'FULL_SECRET_CONTENT_BODY_HERE'
    );
    expect(screen.queryByTestId('unlock-button-test_card_1')).toBeNull();
  });
});
