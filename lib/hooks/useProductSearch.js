'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { productsAPI } from '@/lib/api';

// Async product search for dropdowns — replaces limit:1000 full catalog fetches.
// Only fires when the search term has at least 2 characters.
export function useProductSearch(searchTerm, limit = 20) {
  const { user } = useAuth();
  const trimmed = (searchTerm || '').trim();

  return useQuery({
    queryKey: ['productSearch', trimmed, limit],
    queryFn: async () => {
      const res = await productsAPI.getAll(user.token, { search: trimmed, limit });
      if (!res.success) throw new Error(res.message || 'Search failed');
      // getAll returns { products, pagination } or just an array depending on backend response shape
      const products = res.data?.products || res.data || [];
      return Array.isArray(products) ? products : [];
    },
    enabled: !!user?.token && trimmed.length >= 2,
    staleTime: 30 * 1000, // search results stale after 30s
    placeholderData: [],
  });
}
