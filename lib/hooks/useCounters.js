'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { countersAPI } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useCounters(storeId = null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.counters(storeId),
    queryFn: async () => {
      const res = await countersAPI.getAll(user.token, storeId);
      if (!res.success) throw new Error(res.message || 'Failed to fetch counters');
      return res.data || [];
    },
    enabled: !!user?.token,
  });
}

export function useCreateCounter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => countersAPI.create(data, user.token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counters'] }),
  });
}

export function useUpdateCounter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => countersAPI.update(id, data, user.token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counters'] }),
  });
}

export function useDeleteCounter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => countersAPI.delete(id, user.token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['counters'] }),
  });
}
