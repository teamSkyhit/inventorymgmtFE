'use client';

import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { DashboardProvider } from '@/lib/dashboard-context';
import { Toaster } from '@/components/ui/sonner';
import { CommonProvider } from '@/lib/common-context';
import { CartProvider } from '@/lib/cart-context';
import { SessionTimeoutProvider } from '@/lib/session-timeout-context';
import ErrorBoundary from '@/components/error-boundary';
import SessionTimeoutHandler from '@/components/session-timeout-handler';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
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
        </ErrorBoundary>
      </body>
    </html>
  );
}
