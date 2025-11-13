'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const normalizedAllowed = (allowedRoles || []).map((r) =>
    String(r).toLowerCase()
  );
  const userRole = user?.role?.toLowerCase();

  useEffect(() => {
    if (!loading) {
      console.log('ProtectedRoute check', {
        loading,
        user,
        allowedRoles,
        normalizedAllowed,
        userRole,
      });
      if (!user) {
        console.log('ProtectedRoute: no user, redirecting to /login');
        router.push('/login');
      } else if (
        normalizedAllowed.length > 0 &&
        !normalizedAllowed.includes(userRole)
      ) {
        console.log('ProtectedRoute: user role not allowed, redirecting...');
        // Redirect to appropriate page based on role
        if (userRole === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/scan');
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (
    !user ||
    (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole))
  ) {
    console.log('ProtectedRoute: rendering blocked (returning null)', {
      user,
      normalizedAllowed,
      userRole,
    });
    return null;
  }

  return <>{children}</>;
}
