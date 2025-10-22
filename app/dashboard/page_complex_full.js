'use client';

import ProtectedRoute from '@/components/protected-route';
import AdminLayout from '@/components/admin-layout';
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
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { mockRecentUpdates, mockInventoryDistribution } from '@/lib/mock-data';
import { useDashboard } from '@/lib/dashboard-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

// Mock data for charts
const salesData = [
  { month: 'Jan', sales: 1200, revenue: 48000 },
  { month: 'Feb', sales: 1900, revenue: 76000 },
  { month: 'Mar', sales: 800, revenue: 32000 },
  { month: 'Apr', sales: 2700, revenue: 108000 },
  { month: 'May', sales: 1600, revenue: 64000 },
  { month: 'Jun', sales: 2400, revenue: 96000 },
];

const categoryData = [
  { name: 'Electronics', value: 35, color: '#3b82f6' },
  { name: 'Groceries', value: 25, color: '#10b981' },
  { name: 'Clothing', value: 20, color: '#f59e0b' },
  { name: 'Books', value: 15, color: '#ef4444' },
  { name: 'Others', value: 5, color: '#8b5cf6' },
];

const recentActivity = [
  {
    id: 1,
    action: 'Product Added',
    item: 'Wireless Headphones',
    user: 'John Doe',
    time: '2 minutes ago',
    type: 'success',
  },
  {
    id: 2,
    action: 'Stock Updated',
    item: 'Laptop Pro X',
    user: 'Jane Smith',
    time: '5 minutes ago',
    type: 'info',
  },
  {
    id: 3,
    action: 'Low Stock Alert',
    item: 'Organic Apples',
    user: 'System',
    time: '10 minutes ago',
    type: 'warning',
  },
  {
    id: 4,
    action: 'Product Sold',
    item: 'Cotton T-Shirt',
    user: 'Mike Johnson',
    time: '15 minutes ago',
    type: 'success',
  },
  {
    id: 5,
    action: 'Price Updated',
    item: 'Mystery Novel',
    user: 'Sarah Wilson',
    time: '20 minutes ago',
    type: 'info',
  },
];

export default function DashboardPage() {
  const { metrics, loading, error, refreshMetrics } = useDashboard();
  const { user } = useAuth();

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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user?.name || user?.email}! Here's your inventory
                overview.
              </p>
            </div>
            <Button
              onClick={refreshMetrics}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Total Products
                </CardTitle>
                <Package className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalProducts || 0}
                </div>
                <p className="text-xs opacity-80 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Low Stock
                </CardTitle>
                <AlertTriangle className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.lowStock || 0}
                </div>
                <p className="text-xs opacity-80 flex items-center mt-1">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  -5% from last week
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Total Value
                </CardTitle>
                <DollarSign className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(metrics?.totalValue || 0).toLocaleString()}
                </div>
                <p className="text-xs opacity-80 flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Total Shelves
                </CardTitle>
                <Warehouse className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalShelves || 0}
                </div>
                <p className="text-xs opacity-80">Storage locations</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.totalUsers || 0}
                </div>
                <p className="text-xs opacity-80">Active users</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium opacity-90">
                  Recent Sales
                </CardTitle>
                <ShoppingCart className="h-4 w-4 opacity-90" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.recentSales || 0}
                </div>
                <p className="text-xs opacity-80">Today's transactions</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts and Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Sales Trend Chart */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Sales & Revenue Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Bar
                      yAxisId="left"
                      dataKey="sales"
                      fill="#3b82f6"
                      name="Sales"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-500" />
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-green-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border bg-gray-50"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.type === 'success'
                            ? 'bg-green-500'
                            : activity.type === 'warning'
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.action}
                        </p>
                        <p className="text-sm text-gray-600">{activity.item}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{activity.user}</p>
                        <p className="text-xs text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Inventory Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Warehouse className="h-5 w-5 text-orange-500" />
                  Inventory Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockInventoryDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Updates Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Recent Product Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRecentUpdates.map((update, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {update.product}
                      </TableCell>
                      <TableCell>{update.action}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            update.status === 'completed'
                              ? 'default'
                              : update.status === 'pending'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {update.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date().toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        Admin User
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
