'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { dashboardAPI } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useDashboardMetrics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dashboardMetrics(),
    queryFn: async () => {
      const res = await dashboardAPI.getMetrics(user.token);
      if (!res.success) throw new Error(res.message || 'Failed to fetch metrics');
      return res.data;
    },
    enabled: !!user?.token,
    staleTime: 2 * 60 * 1000,
  });
}

export function useDashboardActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.dashboardActivity(),
    queryFn: async () => {
      const res = await dashboardAPI.getRecentUpdates(user.token);
      if (!res.success) throw new Error(res.message || 'Failed to fetch activity');
      return res.data;
    },
    enabled: !!user?.token,
    staleTime: 2 * 60 * 1000,
  });
}
