'use client';

import './globals.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { getQueryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/lib/auth-context';
import { DashboardProvider } from '@/lib/dashboard-context';
import { Toaster } from '@/components/ui/sonner';
import { CommonProvider } from '@/lib/common-context';
import { CartProvider } from '@/lib/cart-context';
import { SessionTimeoutProvider } from '@/lib/session-timeout-context';
import ErrorBoundary from '@/components/error-boundary';
import SessionTimeoutHandler from '@/components/session-timeout-handler';

export default function RootLayout({ children }) {
  const queryClient = getQueryClient();

  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SessionTimeoutProvider>
                <DashboardProvider>
                  <CommonProvider>
                    <CartProvider>
                      {children}
                      <SessionTimeoutHandler />
                      <Toaster />
                    </CartProvider>
                  </CommonProvider>
                </DashboardProvider>
              </SessionTimeoutProvider>
            </AuthProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
