'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Loader from '@/components/ui/loader';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const normalizedAllowed = (allowedRoles || []).map((r) =>
    String(r).toLowerCase()
  );
  if (normalizedAllowed.includes('admin')) normalizedAllowed.push('super_admin');
  const userRole = user?.role?.toLowerCase();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (
        normalizedAllowed.length > 0 &&
        !normalizedAllowed.includes(userRole)
      ) {
        // Redirect to appropriate page based on role
        if (userRole === 'admin' || userRole === 'super_admin') {
          router.push('/dashboard');
        } else {
          router.push('/inventory');
        }
      }
    }
  }, [user, loading, router, allowedRoles, normalizedAllowed, userRole]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader message="Preparing your workspace..." />
      </div>
    );
  }

  if (
    !user ||
    (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole))
  ) {
    return null;
  }

  return <>{children}</>;
}
