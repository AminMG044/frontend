import { describe, it, expect, beforeEach } from 'vitest';
import {
  useExclusiveContentStore,
  resolveTierLevel,
  DEFAULT_TIER_THRESHOLDS,
  type TierLockedContent,
} from './exclusive-content-store';

describe('useExclusiveContentStore', () => {
  const creatorId = 'creator_test_123';
  const supporterId = 'supporter_test_456';

  beforeEach(() => {
    localStorage.clear();
    useExclusiveContentStore.setState({
      contentByCreator: {},
      supporterTiers: {},
    });
  });

  it('correctly resolves tier levels based on cumulative tip amounts', () => {
    expect(resolveTierLevel(0)).toBe('free');
    expect(resolveTierLevel(4)).toBe('free');
    expect(resolveTierLevel(5)).toBe('bronze');
    expect(resolveTierLevel(14.99)).toBe('bronze');
    expect(resolveTierLevel(15)).toBe('silver');
    expect(resolveTierLevel(29)).toBe('silver');
    expect(resolveTierLevel(30)).toBe('gold');
    expect(resolveTierLevel(49.99)).toBe('gold');
    expect(resolveTierLevel(50)).toBe('platinum');
    expect(resolveTierLevel(100)).toBe('platinum');
  });

  it('allows creators to add, update, and delete tier-locked content', () => {
    const store = useExclusiveContentStore.getState();

    // 1. Add
    const created = store.addContent(creatorId, {
      title: 'Secret Demo Track',
      content: 'https://example.com/secret.mp3',
      requiredTier: 'silver',
      requiredAmount: 15,
      previewSnippet: 'Listen to unreleased audio',
    });

    expect(created.id).toBeDefined();
    expect(created.title).toBe('Secret Demo Track');

    let contents = useExclusiveContentStore.getState().getContentForCreator(creatorId);
    expect(contents).toHaveLength(1);
    expect(contents[0].id).toBe(created.id);

    // 2. Update
    useExclusiveContentStore.getState().updateContent(creatorId, created.id, {
      title: 'Secret Demo Track (Remastered)',
    });
    contents = useExclusiveContentStore.getState().getContentForCreator(creatorId);
    expect(contents[0].title).toBe('Secret Demo Track (Remastered)');

    // 3. Delete
    useExclusiveContentStore.getState().deleteContent(creatorId, created.id);
    contents = useExclusiveContentStore.getState().getContentForCreator(creatorId);
    expect(contents).toHaveLength(0);
  });

  it('locks content when supporter tip amount is below threshold', () => {
    const store = useExclusiveContentStore.getState();
    const content = store.addContent(creatorId, {
      title: 'VIP Masterclass',
      content: 'Private Zoom link',
      requiredTier: 'gold',
      requiredAmount: 30,
    });

    // Supporter tipped only $10
    store.recordSupporterTip(creatorId, supporterId, 10);

    const isUnlocked = useExclusiveContentStore
      .getState()
      .isContentUnlocked(creatorId, supporterId, content);
    expect(isUnlocked).toBe(false);

    const status = useExclusiveContentStore.getState().getSupporterStatus(creatorId, supporterId);
    expect(status.currentTier).toBe('bronze');
    expect(status.cumulativeTipped).toBe(10);
  });

  it('automatically unlocks content when cumulative tips reach or exceed threshold', () => {
    const store = useExclusiveContentStore.getState();
    const content = store.addContent(creatorId, {
      title: 'VIP Masterclass',
      content: 'Private Zoom link',
      requiredTier: 'gold',
      requiredAmount: 30,
    });

    // Supporter tips $10 first
    store.recordSupporterTip(creatorId, supporterId, 10);
    // Supporter tips another $20 (total $30)
    store.recordSupporterTip(creatorId, supporterId, 20);

    const isUnlocked = useExclusiveContentStore
      .getState()
      .isContentUnlocked(creatorId, supporterId, content);
    expect(isUnlocked).toBe(true);

    const status = useExclusiveContentStore.getState().getSupporterStatus(creatorId, supporterId);
    expect(status.currentTier).toBe('gold');
    expect(status.cumulativeTipped).toBe(30);
    expect(status.unlockedContentIds).toContain(content.id);
  });

  it('permanently keeps content unlocked across sessions', () => {
    const store = useExclusiveContentStore.getState();
    const content = store.addContent(creatorId, {
      title: 'Backstage Pass',
      content: 'Pass Code: 1234',
      requiredTier: 'platinum',
      requiredAmount: 50,
    });

    store.recordSupporterTip(creatorId, supporterId, 50);
    expect(
      useExclusiveContentStore.getState().isContentUnlocked(creatorId, supporterId, content)
    ).toBe(true);

    // Simulate page reload by reading status
    const status = useExclusiveContentStore.getState().getSupporterStatus(creatorId, supporterId);
    expect(status.unlockedContentIds).toContain(content.id);
  });

  it('allows creators to always view their own content as unlocked', () => {
    const store = useExclusiveContentStore.getState();
    const content = store.addContent(creatorId, {
      title: 'Creator Own Post',
      content: 'My secret draft',
      requiredTier: 'platinum',
      requiredAmount: 50,
    });

    // Supporter ID is creatorId itself
    expect(
      useExclusiveContentStore.getState().isContentUnlocked(creatorId, creatorId, content)
    ).toBe(true);
  });
});
