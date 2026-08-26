'use client';

import RoleBasedLayout from '@/components/role-based-layout';

export default function ProtectedLayout({ children }) {
  return <RoleBasedLayout>{children}</RoleBasedLayout>;
}
