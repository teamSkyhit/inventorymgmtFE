'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// What each kind of change can affect. Keys are React Query key prefixes.
// invalidateQueries refetches only queries currently on screen; the rest are
// marked stale and refetch once, the next time their page mounts.
const AFFECTS = {
  product: ['products', 'productSearch', 'store-inventory', 'product-inventory', 'dashboard'],
  category: ['categories', 'products', 'productSearch'],
  brassRate: ['brassRate', 'products', 'productSearch'],
  shelf: ['shelves', 'products'],
  storeInventory: ['store-inventory', 'product-inventory', 'products', 'dashboard'],
  stockTransfer: ['transfers', 'store-inventory', 'product-inventory', 'products', 'dashboard'],
  return: ['returns', 'products', 'store-inventory', 'product-inventory', 'sales'],
  store: ['stores', 'counters'],
  counter: ['counters'],
  user: ['users', 'counters'],
  shift: ['shifts'],
  sale: ['sales', 'dashboard'],
  enquiry: ['enquiries'],
  settings: ['settings'],
};

export function invalidateFor(qc, ...entities) {
  const prefixes = new Set(entities.flatMap((e) => AFFECTS[e] || []));
  return Promise.all(
    [...prefixes].map((prefix) => qc.invalidateQueries({ queryKey: [prefix] }))
  );
}

export function useCacheSync() {
  const qc = useQueryClient();
  return useCallback((...entities) => invalidateFor(qc, ...entities), [qc]);
}
