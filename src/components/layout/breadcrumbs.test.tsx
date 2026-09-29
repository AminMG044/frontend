import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Breadcrumbs } from './breadcrumbs';

// Mock next/navigation
const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing on the root path', () => {
    mockPathname.mockReturnValue('/');
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing on empty path', () => {
    mockPathname.mockReturnValue('');
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumb trail for /creators/alice/dashboard', () => {
    mockPathname.mockReturnValue('/creators/alice/dashboard');
    render(<Breadcrumbs />);

    expect(screen.getByTestId('breadcrumbs-nav')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();

    // Check Home link
    const homeLink = screen.getByTestId('breadcrumb-link-0');
    expect(homeLink).toHaveAttribute('href', '/');
    expect(homeLink).toHaveTextContent('Home');

    // Check Creators link
    const creatorsLink = screen.getByTestId('breadcrumb-link-1');
    expect(creatorsLink).toHaveAttribute('href', '/creators');
    expect(creatorsLink).toHaveTextContent('Creators');

    // Check Alice link
    const aliceLink = screen.getByTestId('breadcrumb-link-2');
    expect(aliceLink).toHaveAttribute('href', '/creators/alice');
    expect(aliceLink).toHaveTextContent('Alice');

    // Check current page: Dashboard
    const dashboardCurrent = screen.getByTestId('breadcrumb-current-3');
    expect(dashboardCurrent).toHaveTextContent('Dashboard');
    expect(dashboardCurrent).toHaveAttribute('aria-current', 'page');
  });

  it('renders custom items when provided', () => {
    mockPathname.mockReturnValue('/custom');
    render(
      <Breadcrumbs
        items={[
          { label: 'Root', href: '/' },
          { label: 'Explore', href: '/explore' },
          { label: 'Item Detail' },
        ]}
      />
    );

    expect(screen.getByText('Root')).toBeInTheDocument();
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Item Detail')).toBeInTheDocument();
    expect(screen.getByTestId('breadcrumb-current-2')).toHaveTextContent('Item Detail');
  });

  it('applies custom className', () => {
    mockPathname.mockReturnValue('/creators');
    render(<Breadcrumbs className="custom-test-class" />);

    const nav = screen.getByTestId('breadcrumbs-nav');
    expect(nav).toHaveClass('custom-test-class');
  });
});
