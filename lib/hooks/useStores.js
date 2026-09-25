'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { storesAPI } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { STATIC_STALE_TIME } from '@/lib/queryClient';
import { invalidateFor } from '@/lib/cacheSync';

export function useStores() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.stores(),
    queryFn: async () => {
      const res = await storesAPI.getAll(user.token);
      if (!res.success) throw new Error(res.message || 'Failed to fetch stores');
      return res.data || [];
    },
    enabled: !!user?.token,
    staleTime: STATIC_STALE_TIME,
  });
}

export function useCreateStore() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => storesAPI.create(data, user.token),
    onSuccess: () => invalidateFor(qc, 'store'),
  });
}

export function useUpdateStore() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => storesAPI.update(id, data, user.token),
    onSuccess: () => invalidateFor(qc, 'store'),
  });
}

export function useDeleteStore() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => storesAPI.delete(id, user.token),
    onSuccess: () => invalidateFor(qc, 'store'),
  });
}
