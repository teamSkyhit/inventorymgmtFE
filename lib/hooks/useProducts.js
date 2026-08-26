'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { productsAPI } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useProducts(params = {}) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.products(params),
    queryFn: async () => {
      const res = await productsAPI.getAll(user.token, params);
      if (!res.success) throw new Error(res.message || 'Failed to fetch products');
      return res.data;
    },
    enabled: !!user?.token,
    // Products list changes frequently — use shorter stale time
    staleTime: 2 * 60 * 1000,
  });
}

export function useProduct(id) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.product(id),
    queryFn: async () => {
      const res = await productsAPI.getWithVariants(id, user.token);
      if (!res.success) throw new Error(res.message || 'Failed to fetch product');
      return res.data;
    },
    enabled: !!user?.token && !!id,
  });
}

export function useCreateProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => productsAPI.create(data, user.token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => productsAPI.update(id, data, user.token),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: queryKeys.product(id) });
    },
  });
}

export function useDeleteProduct() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => productsAPI.delete(id, user.token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
