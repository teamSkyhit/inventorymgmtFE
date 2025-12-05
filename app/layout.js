'use client';

import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { DashboardProvider } from '@/lib/dashboard-context';
import { Toaster } from '@/components/ui/sonner';
import { CommonProvider } from '@/lib/common-context';
import { CartProvider } from '@/lib/cart-context';
import ErrorBoundary from '@/components/error-boundary';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <AuthProvider>
            <DashboardProvider>
              <CommonProvider>
                <CartProvider>
                  {children}
                  <Toaster />
                </CartProvider>
              </CommonProvider>
            </DashboardProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
