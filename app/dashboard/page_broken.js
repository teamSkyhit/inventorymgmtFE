'use client';

import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  AlertTriangle,
  DollarSign,
  Warehouse,
  Users,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';
import { useDashboard } from '@/lib/dashboard-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { metrics, loading, error, refreshMetrics } = useDashboard();
  const { user } = useAuth();

  console.log('Dashboard render - metrics:', metrics, 'loading:', loading, 'error:', error);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminLayout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={refreshMetrics} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </AdminLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.name || user?.email}! Here's your inventory overview.
              </p>
            </div>
            <Button onClick={refreshMetrics} variant="outline" size="sm" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* Debug Info */}
          <Card className="bg-yellow-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="text-yellow-800">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>User:</strong> {user ? JSON.stringify(user) : 'null'}</p>
                <p><strong>Loading:</strong> {loading ? 'true' : 'false'}</p>
                <p><strong>Error:</strong> {error || 'null'}</p>
                <p><strong>Metrics:</strong> {metrics ? JSON.stringify(metrics) : 'null'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Products</CardTitle>
                <Package className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalProducts || 0}</div>
                <p className="text-xs opacity-80">Items in inventory</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.lowStock || 0}</div>
                <p className="text-xs opacity-80">Items need restocking</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(metrics?.totalValue || 0).toLocaleString()}</div>
                <p className="text-xs opacity-80">Total inventory value</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Shelves</CardTitle>
                <Warehouse className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalShelves || 0}</div>
                <p className="text-xs opacity-80">Storage locations</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Total Users</CardTitle>
                <Users className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
                <p className="text-xs opacity-80">Active users</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">Recent Sales</CardTitle>
                <ShoppingCart className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.recentSales || 0}</div>
                <p className="text-xs opacity-80">Today's transactions</p>
              </CardContent>
            </Card>
          </div>

          {/* Simple Activity Section */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{metrics?.totalProducts || 0}</p>
                  <p className="text-sm text-gray-600">Products</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{metrics?.lowStock || 0}</p>
                  <p className="text-sm text-gray-600">Low Stock</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">${(metrics?.totalValue || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total Value</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{metrics?.recentSales || 0}</p>
                  <p className="text-sm text-gray-600">Recent Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}