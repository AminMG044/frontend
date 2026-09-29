import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CreatorVerificationBadge } from './shared/creator-verification-badge';
import { CreatorSearchBar } from './sections/creator-search-bar';
import type { CreatorSearchFilters } from '@/hooks/use-creator-search';

const filters: CreatorSearchFilters = { category: '', search: '', verifiedOnly: false, minEarnings: '', maxEarnings: '', sort: 'trending', page: 1 };

describe('stable UI snapshots', () => {
  it('captures verification states', () => {
    const { container } = render(<CreatorVerificationBadge verified status="verified" showDetails verifiedAt="2026-01-01T00:00:00.000Z" verificationType="identity" />);
    expect(container).toMatchSnapshot();
  });
  it('captures the creator search controls', () => {
    const { container } = render(<CreatorSearchBar filters={filters} onChange={() => undefined} onReset={() => undefined} />);
    expect(container).toMatchSnapshot();
  });
});
