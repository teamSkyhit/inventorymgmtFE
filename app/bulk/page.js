'use client';

import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';

export default function BulkPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
          <h1 className="text-3xl font-bold">Bulk Operations</h1>
          <p className="text-muted-foreground">
            Bulk import/export is temporarily paused while we align it with the new syncing
            pipeline. Please use individual product actions for now or let us know if you need early
            access.
          </p>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}

