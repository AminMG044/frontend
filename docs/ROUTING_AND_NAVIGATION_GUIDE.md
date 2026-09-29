# Dorisio Routing and Navigation Guide

Comprehensive architectural documentation and implementation patterns for routing, navigation, state management, and breadcrumbs in the Dorisio web application.

---

## 1. Routing Architecture

Dorisio is built on **Next.js 14 (App Router)** leveraging React Server Components (RSC) and Client Components.

### Directory Structure & Route Organization

```
src/app/
├── (app)/                       # Route group with primary application layout
│   ├── layout.tsx              # Global navigation, footer, theme provider
│   ├── page.tsx                # Landing page (/)
│   ├── creators/
│   │   ├── page.tsx            # Creator directory (/creators)
│   │   └── [username]/
│   │       ├── page.tsx        # Public creator profile (/creators/:username)
│   │       └── dashboard/      # Creator-only dashboard (/creators/:username/dashboard)
│   │           ├── layout.tsx  # Dashboard tab navigation
│   │           └── page.tsx    # Earnings, stats, wallet settings
│   └── settings/
│       └── page.tsx            # User settings (/settings)
├── (auth)/                      # Route group for unauthenticated flows
│   ├── layout.tsx              # Minimal auth layout (centered card, no nav)
│   ├── login/
│   │   └── page.tsx            # Login page (/login)
│   ├── register/
│   │   └── page.tsx            # Registration page (/register)
│   └── verify-email/
│       └── page.tsx            # Verification link landing (/verify-email)
├── api/                         # Next.js Route Handlers
│   ├── creators/
│   │   └── [username]/
│   │       └── analytics/
│   │           └── route.ts    # Creator analytics API endpoint
│   └── og/
│       └── route.tsx           # Dynamic OpenGraph image generation
├── embed/                       # Embeddable widget routes
│   └── [username]/
│       └── page.tsx            # Standalone tip widget for iframes
├── layout.tsx                  # Root layout (html, body, global providers)
├── loading.tsx                 # Root suspense fallback
├── error.tsx                   # Root error boundary
└── not-found.tsx               # 404 handler
```

### Key Routing Conventions

1. **Route Groups `(group)`**: Organize routes without altering URL pathnames (e.g. `(app)` provides nav/footer, `(auth)` provides centered authentication forms).
2. **Dynamic Segments `[param]`**: Match dynamic URL segments such as usernames or transaction IDs.
3. **Colocated UI States**: Each route folder can contain `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx`.
4. **Client Boundaries**: Interactive components specify `'use client'` at the top of the file, while keeping layout wrappers server-friendly.

---

## 2. Advanced Routing Patterns (5+ Scenarios)

### Scenario 1: Nested Routing & Dashboard Layouts

Nested layouts persist across child route transitions, maintaining scroll position and preventing redundant rerenders of sidebar/header state.

```tsx
// src/app/(app)/creators/[username]/dashboard/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ProtectedRoute } from '@/components/protected-route';

interface DashboardLayoutProps {
  children: React.ReactNode;
  params: { username: string };
}

export default function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const pathname = usePathname();
  const basePath = `/creators/${params.username}/dashboard`;

  const tabs = [
    { label: 'Overview', href: basePath },
    { label: 'Transactions', href: `${basePath}/transactions` },
    { label: 'Exclusive Content', href: `${basePath}/content` },
    { label: 'Tier Settings', href: `${basePath}/tiers` },
  ];

  return (
    <ProtectedRoute requiredRole="creator">
      <div className="container mx-auto px-4 py-6">
        <Breadcrumbs />
        
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Creator Studio</h1>
          <p className="text-muted-foreground">Manage your tips, earnings, and supporters</p>
        </header>

        {/* Tab Navigation */}
        <nav className="flex space-x-4 border-b border-border mb-6" aria-label="Dashboard Tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  isActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <main>{children}</main>
      </div>
    </ProtectedRoute>
  );
}
```

### Scenario 2: Dynamic Routing with Parameter Validation & Metadata

Type-safe dynamic routes with static & dynamic metadata generation for SEO and social sharing:

```tsx
// src/app/(app)/creators/[username]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface CreatorPageProps {
  params: { username: string };
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { username } = params;
  return {
    title: `${username} | Dorisio Creator Profile`,
    description: `Support ${username} directly with Stellar-powered micro-tips and unlock exclusive rewards.`,
    openGraph: {
      title: `${username} on Dorisio`,
      description: `Support ${username} with crypto micro-tips.`,
      images: [`/api/og?username=${encodeURIComponent(username)}`],
    },
  };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { username } = params;

  // Validate username format
  if (!username || !/^[a-zA-Z0-9_-]+$/.test(username)) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Creator Profile Components */}
    </div>
  );
}
```

### Scenario 3: Authentication & Role-Protected Routes

Multi-tier authentication and hydration protection preventing flashes of unauthenticated content:

```tsx
// src/components/protected-route.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthHydrationGuard } from '@/hooks/use-auth-hydration-guard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'fan' | 'creator' | 'admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isReady, isAuthenticated, user } = useAuthHydrationGuard();

  useEffect(() => {
    if (!isReady) return;

    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
      router.replace('/unauthorized');
    }
  }, [isReady, isAuthenticated, user, requiredRole, pathname, router]);

  if (!isReady || !isAuthenticated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
```

### Scenario 4: URL Query State Synchronization (Deep Linking & Filters)

Keep complex UI filter state synced with URL search parameters for shareable, bookmarkable URLs:

```tsx
// src/hooks/use-filter-query-state.ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export function useFilterQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getParam = useCallback(
    (key: string, defaultValue = '') => searchParams.get(key) ?? defaultValue,
    [searchParams]
  );

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Shallow client transition without scroll jump
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { getParam, setParam, searchParams };
}
```

### Scenario 5: Intercepting Routes & Modal Overlays

Displaying modals (e.g. quick tip, photo view) on top of the current route while preserving direct URL accessibility:

```
src/app/(app)/creators/[username]/
├── @modal/
│   └── (.)tip/
│       └── page.tsx        # Intercepted tip modal
├── default.tsx             # Default slot fallback
├── page.tsx                # Creator profile page
└── tip/
    └── page.tsx            # Full-page fallback for direct access
```

### Scenario 6: Sentry Route Tracking & Monitoring Breadcrumbs

Automatically track route transitions as Sentry navigation breadcrumbs for comprehensive crash analytics:

```tsx
// src/components/route-tracker.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { addMonitoringBreadcrumb } from '@/lib/monitoring';

export function RouteTracker(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    addMonitoringBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${url}`,
      data: { pathname, searchParams: searchParams?.toString() },
    });
  }, [pathname, searchParams]);

  return null;
}
```

---

## 3. Breadcrumb Implementation Guide

Breadcrumbs provide hierarchical navigational context for users and search engine crawlers.

### Component Design & Accessibility

```tsx
// src/components/layout/breadcrumbs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

const ROUTE_LABELS: Record<string, string> = {
  creators: 'Creators',
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  settings: 'Settings',
  content: 'Exclusive Content',
  tiers: 'Tip Tiers',
};

export function Breadcrumbs(): JSX.Element | null {
  const pathname = usePathname();

  const items: BreadcrumbItem[] = useMemo(() => {
    if (!pathname || pathname === '/') return [];

    const segments = pathname.split('/').filter(Boolean);
    const trail: BreadcrumbItem[] = [
      { label: 'Home', href: '/', isCurrent: false },
    ];

    let currentHref = '';
    segments.forEach((seg, idx) => {
      currentHref += `/${seg}`;
      const isCurrent = idx === segments.length - 1;
      const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
      trail.push({ label, href: currentHref, isCurrent });
    });

    return trail;
  }, [pathname]);

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center text-sm text-muted-foreground">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center space-x-2">
            {index > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
            {item.isCurrent ? (
              <span className="font-semibold text-foreground" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                {index === 0 && <Home className="h-3.5 w-3.5" />}
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

---

## 4. Navigation State Management

### Scroll Restoration

Next.js 14 App Router automatically handles scroll restoration when navigating with `next/link`. For modal transitions or tab selections where page jumping is undesirable, pass `{ scroll: false }`:

```tsx
router.push('/creators?tab=portfolio', { scroll: false });
```

### Loading State & Suspense

Use `loading.tsx` next to `page.tsx` for instant loading spinners during route streaming:

```tsx
// src/app/(app)/creators/[username]/loading.tsx
import { CreatorPageSkeleton } from '@/components/shared/creator-skeletons';

export default function Loading() {
  return <CreatorPageSkeleton />;
}
```

---

## 5. Migration Guide: Pages Router to App Router

When migrating existing routes from Next.js Pages router (`pages/`):

| Pages Router (`pages/`) | App Router (`src/app/`) | Notes |
| :--- | :--- | :--- |
| `pages/index.tsx` | `src/app/(app)/page.tsx` | Wrap in route group for layout sharing |
| `pages/_app.tsx` | `src/app/layout.tsx` + `providers.tsx` | Move global providers into layout |
| `pages/creators/[id].tsx` | `src/app/(app)/creators/[username]/page.tsx` | Convert `useRouter().query` to `params` prop |
| `router.push('/login')` | `useRouter()` from `'next/navigation'` | Note: import is `'next/navigation'`, not `'next/router'` |

---

## 6. Troubleshooting Common Routing Issues

### 1. Hydration Mismatch on Protected Routes
- **Cause**: Rendering authentication-gated UI before the persisted Zustand store has rehydrated on the client.
- **Solution**: Always guard with `hasHydrated` from `useAuthStore` or `useAuthHydrationGuard()`. Do not render auth UI until `hasHydrated === true`.

### 2. Infinite Redirect Loops
- **Cause**: Redirecting to `/login?redirect=/login` or redirecting inside `useEffect` without checking if the current path is already the destination.
- **Solution**: Check `if (pathname === '/login') return;` before triggering `router.replace()`.

### 3. Outdated Query Parameters
- **Cause**: Using `window.location.search` directly instead of Next.js `useSearchParams()`.
- **Solution**: Use `useSearchParams()`, which re-renders reactively upon client navigation.
