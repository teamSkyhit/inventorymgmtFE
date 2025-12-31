'use client';

import { useDashboard } from '@/lib/dashboard-context';
import { useAuth } from '@/lib/auth-context';

export default function TestDashboard() {
  const { metrics, loading, error } = useDashboard();
  const { user } = useAuth();

  console.log('TestDashboard - User:', user);
  console.log('TestDashboard - Metrics:', metrics);
  console.log('TestDashboard - Loading:', loading);
  console.log('TestDashboard - Error:', error);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dashboard Test</h1>
      <div>
        <p>
          <strong>User:</strong> {user ? JSON.stringify(user) : 'null'}
        </p>
        <p>
          <strong>Loading:</strong> {loading ? 'true' : 'false'}
        </p>
        <p>
          <strong>Error:</strong> {error || 'null'}
        </p>
        <p>
          <strong>Metrics:</strong> {metrics ? JSON.stringify(metrics) : 'null'}
        </p>
      </div>

      {loading && <p>Loading dashboard...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {metrics && (
        <div>
          <h2>Metrics Data:</h2>
          <ul>
            <li>Total Products: {metrics.totalProducts}</li>
            <li>Low Stock: {metrics.lowStock}</li>
            <li>Total Value: ₹{metrics.totalValue}</li>
            <li>Total Shelves: {metrics.totalShelves}</li>
            <li>Total Users: {metrics.totalUsers}</li>
            <li>Recent Sales: {metrics.recentSales}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
