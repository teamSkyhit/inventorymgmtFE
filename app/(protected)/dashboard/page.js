'use client';

import { useMemo } from 'react';
import ProtectedRoute from '@/components/protected-route';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDashboard } from '@/lib/dashboard-context';
import { useCommon } from '@/lib/common-context';
import { Button } from '@/components/ui/button';
import Loader from '@/components/ui/loader';

export default function DashboardPage() {
  const { metrics, loading, error, refreshMetrics, recentUpdates } =
    useDashboard();
  const { categories, loading: categoriesLoading } = useCommon();

  const updates = Array.isArray(recentUpdates) ? recentUpdates : [];

  const inventoryDistribution = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.map((category) => ({
      category: category.name,
      products:
        category._count?.products ?? category.products?.length ?? 0,
    }));
  }, [categories]);

  const hasDistributionData = inventoryDistribution.some(
    (item) => item.products > 0
  );

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
          <div className="flex items-center justify-center h-64">
            <Loader message="Loading dashboard..." />
          </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
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
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Overview of your inventory system
              </p>
            </div>
            <Button onClick={refreshMetrics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Products
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalProducts || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items in inventory
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.lowStock || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Items need restocking
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Value
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{(metrics?.totalValue || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total inventory value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Shelves
                </CardTitle>
                <Warehouse className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalShelves || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Storage locations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">Active users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Recent Sales
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.recentSales || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Today's transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {updates.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No recent activity.
                      </TableCell>
                    </TableRow>
                  ) : (
                    updates.slice(0, 8).map((update) => (
                      <TableRow key={update.id}>
                        <TableCell className="font-medium">
                          {update.productName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {update.category || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              update.status === 'Deleted'
                                ? 'destructive'
                                : update.status === 'Added'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {update.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {update.date}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Inventory Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Distribution by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader message="Calculating distribution..." />
                </div>
              ) : hasDistributionData ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={inventoryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="products" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No category data available.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
    </ProtectedRoute>
  );
}
