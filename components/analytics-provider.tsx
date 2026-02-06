'use client';

import { useEffect } from 'react';
import { initAnalytics, identifyUser } from '@/lib/analytics';
import { useDashboardStore } from '@/lib/store';

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useDashboardStore();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        name: user.displayName,
      });
    }
  }, [user]);

  return <>{children}</>;
}
