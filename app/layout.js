'use client';

import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { DashboardProvider } from '@/lib/dashboard-context';
import { Toaster } from '@/components/ui/sonner';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <DashboardProvider>
            {children}
            <Toaster />
          </DashboardProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
