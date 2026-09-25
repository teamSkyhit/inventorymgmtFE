'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { categoriesAPI } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { STATIC_STALE_TIME } from '@/lib/queryClient';
import { invalidateFor } from '@/lib/cacheSync';

export function useCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.categories(),
    queryFn: async () => {
      const res = await categoriesAPI.getAll(user.token);
      if (!res.success) throw new Error(res.message || 'Failed to fetch categories');
      return res.data || [];
    },
    enabled: !!user?.token,
    staleTime: STATIC_STALE_TIME,
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => categoriesAPI.create(data, user.token),
    onSuccess: () => invalidateFor(qc, 'category'),
  });
}

export function useUpdateCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => categoriesAPI.update(id, data, user.token),
    onSuccess: () => invalidateFor(qc, 'category'),
  });
}

export function useDeleteCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => categoriesAPI.delete(id, user.token),
    onSuccess: () => invalidateFor(qc, 'category'),
  });
}
