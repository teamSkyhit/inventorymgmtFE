'use client';

import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,       // 5 min — serve from cache, revalidate in bg
        gcTime: 10 * 60 * 1000,         // 10 min — keep unused data before GC
        retry: 1,                        // one retry on failure
        refetchOnWindowFocus: false,     // don't hammer on tab-switch
        refetchOnReconnect: true,        // do refresh when coming back online
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
