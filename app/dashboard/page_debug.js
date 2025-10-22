'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  console.log('=== Dashboard Page Render ===');
  console.log('User:', user);
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Metrics:', metrics);
  console.log('=== End Debug ===');

  // Always render the page content, don't block on loading
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard (No Protected Route)
          </h1>
          <p className="text-gray-600">
            Testing dashboard without authentication
          </p>
        </div>

        {/* Debug Info */}
        <Card className="mb-6 bg-yellow-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>
                <strong>User:</strong>{' '}
                {user ? JSON.stringify(user, null, 2) : 'null'}
              </p>
              <p>
                <strong>Loading:</strong> {loading ? 'true' : 'false'}
              </p>
              <p>
                <strong>Error:</strong> {error || 'null'}
              </p>
              <p>
                <strong>Metrics:</strong>{' '}
                {metrics ? JSON.stringify(metrics, null, 2) : 'null'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Loading indicator */}
        {loading && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-blue-700">Loading dashboard data...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error indicator */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-red-700">Error: {error}</span>
                <Button onClick={refreshMetrics} size="sm" variant="outline">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metrics Grid - Always render */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Products
                <Package className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.totalProducts || 0}
              </div>
              <p className="text-xs opacity-80">Items in inventory</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Low Stock
                <AlertTriangle className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.lowStock || 0}</div>
              <p className="text-xs opacity-80">Items need restocking</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Value
                <DollarSign className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(metrics?.totalValue || 0).toLocaleString()}
              </div>
              <p className="text-xs opacity-80">Total inventory value</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Shelves
                <Warehouse className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.totalShelves || 0}
              </div>
              <p className="text-xs opacity-80">Storage locations</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Total Users
                <Users className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.totalUsers || 0}
              </div>
              <p className="text-xs opacity-80">Active users</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                Recent Sales
                <ShoppingCart className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.recentSales || 0}
              </div>
              <p className="text-xs opacity-80">Today's transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button onClick={refreshMetrics} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
