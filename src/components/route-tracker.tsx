'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { addMonitoringBreadcrumb } from '@/lib/monitoring';

/**
 * RouteTracker
 *
 * Records every route change as a monitoring breadcrumb so error reports
 * include the navigation path the user took before hitting an error.
 * Renders nothing.
 */
export function RouteTracker(): null {
  const pathname = usePathname();

  useEffect(() => {
    addMonitoringBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${pathname}`,
      level: 'info',
      data: { pathname },
    });
  }, [pathname]);

  return null;
}
