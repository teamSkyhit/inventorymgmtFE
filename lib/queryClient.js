'use client';

import { QueryClient } from '@tanstack/react-query';

export const STATIC_STALE_TIME = 30 * 60 * 1000;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // POS and other admins change stock/sales outside this tab, so data goes stale after 1 min.
        // CRM-only data (categories, stores, shelves, users) overrides this with STATIC_STALE_TIME;
        // CRM edits refresh the cache explicitly via lib/cacheSync.
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
        // Only refetch stale SUCCESSFUL queries on focus — skip errored ones to avoid spam
        refetchOnWindowFocus: (query) => query.state.status !== 'error',
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserClient;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  if (!browserClient) {
    browserClient = makeQueryClient();
  }
  return browserClient;
}
