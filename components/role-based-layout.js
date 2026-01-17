'use client'

import { useAuth } from '@/lib/auth-context'
import AdminLayout from '@/components/admin-layout'
import UserLayout from '@/components/user-layout'
import Loader from '@/components/ui/loader'

export default function RoleBasedLayout({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader message="Loading..." />
      </div>
    )
  }

  const userRole = user?.role?.toLowerCase()

  if (userRole === 'admin') {
    return <AdminLayout>{children}</AdminLayout>
  }

  return <UserLayout>{children}</UserLayout>
}



