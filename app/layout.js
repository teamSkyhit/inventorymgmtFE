'use client';

import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { DashboardProvider } from '@/lib/dashboard-context';
import { Toaster } from '@/components/ui/sonner';
import { CommonProvider } from '@/lib/common-context';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <DashboardProvider>
            <CommonProvider>
              {children}
              <Toaster />
            </CommonProvider>
          </DashboardProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
