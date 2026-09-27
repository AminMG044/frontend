import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SupporterBadge } from './supporter-badge';

describe('SupporterBadge', () => {
  it('renders the tier label and tier attribute', () => {
    render(<SupporterBadge tier="gold" />);

    const badge = screen.getByText('Gold');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('[data-badge-tier]')).toHaveAttribute('data-badge-tier', 'gold');
  });

  it('exposes an accessible label for the tier', () => {
    render(<SupporterBadge tier="silver" />);

    expect(screen.getByRole('status', { name: 'Silver supporter badge' })).toBeInTheDocument();
  });

  it('renders nothing for the "none" tier by default', () => {
    const { container } = render(<SupporterBadge tier="none" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a placeholder when hideWhenNone is false', () => {
    render(<SupporterBadge tier="none" hideWhenNone={false} />);

    expect(screen.getByText('New supporter')).toBeInTheDocument();
  });
});
