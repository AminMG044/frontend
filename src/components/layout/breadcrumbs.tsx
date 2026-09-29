'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import React, { useMemo } from 'react';

export interface BreadcrumbCustomItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  /** Optional custom breadcrumb trail override */
  items?: BreadcrumbCustomItem[];
  /** Optional class name */
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  creators: 'Creators',
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  settings: 'Settings',
  content: 'Exclusive Content',
  tiers: 'Tip Tiers',
  analytics: 'Analytics',
  login: 'Log In',
  register: 'Sign Up',
  'verify-email': 'Verify Email',
};

export function Breadcrumbs({ items: customItems, className = '' }: BreadcrumbsProps): JSX.Element | null {
  const pathname = usePathname();

  const items = useMemo(() => {
    if (customItems && customItems.length > 0) {
      return customItems.map((item, index) => ({
        label: item.label,
        href: item.href,
        isCurrent: index === customItems.length - 1,
      }));
    }

    if (!pathname || pathname === '/') return [];

    const segments = pathname.split('/').filter(Boolean);
    const trail: Array<{ label: string; href?: string; isCurrent: boolean }> = [
      { label: 'Home', href: '/', isCurrent: false },
    ];

    let currentHref = '';
    segments.forEach((seg, idx) => {
      currentHref += `/${seg}`;
      const isCurrent = idx === segments.length - 1;
      const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
      trail.push({ label, href: isCurrent ? undefined : currentHref, isCurrent });
    });

    return trail;
  }, [customItems, pathname]);

  if (!items || items.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-4 flex items-center text-sm text-muted-foreground ${className}`}
      data-testid="breadcrumbs-nav"
    >
      <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5 sm:gap-2">
            {index > 0 && (
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
                aria-hidden="true"
              />
            )}
            {item.isCurrent || !item.href ? (
              <span
                className="font-medium text-foreground"
                aria-current={item.isCurrent ? 'page' : undefined}
                data-testid={`breadcrumb-current-${index}`}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors flex items-center gap-1"
                data-testid={`breadcrumb-link-${index}`}
              >
                {index === 0 && <Home className="h-3.5 w-3.5" aria-hidden="true" />}
                <span>{item.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
