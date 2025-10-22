'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardAPI } from './api';
import { useAuth } from './auth-context';

const DashboardContext = createContext({});

export const DashboardProvider = ({ children }) => {
  const [metrics, setMetrics] = useState(null);
  const [recentUpdates, setRecentUpdates] = useState(null);
  const [loading, setLoading] = useState(false); // Start with false instead of true
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  console.log('DashboardProvider render - user:', user);

  // Fetch dashboard metrics - removed useCallback to avoid dependency issues
  const fetchMetrics = async () => {
    console.log('fetchMetrics called, user token:', user?.token);
    if (!user?.token) {
      console.log('No token, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      console.log('Setting loading to true');
      setLoading(true);
      setError(null);
      console.log('Calling dashboardAPI.getMetrics...');
      const response = await dashboardAPI.getMetrics(user.token);
      console.log('API response:', response);

      if (response.success) {
        console.log('Setting metrics:', response.data);
        setMetrics(response.data);
      } else {
        console.log('API error:', response.message);
        setError(response.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err.message || 'Failed to fetch metrics');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };
  const fetchRecentUpdates = async () => {
    console.log('fetchRecentUpdates called, user token:', user?.token);
    if (!user?.token) {
      console.log('No token, cannot fetch recent updates');
      return;
    }
    try {
      console.log('Setting loading to true for recent updates');
      setLoading(true);
      // Simulate fetching recent updates
      // In a real scenario, you would call an API endpoint here
      console.log('Fetching recent updates...');
      // Simulated delay
      const response = await dashboardAPI.getRecentUpdates(user.token);
      if (response.success) {
        console.log('Setting recent updates:', response.data);
        setRecentUpdates(response.data);
      } else {
        console.log('API error:', response.message);
        setError(response.message || 'Failed to fetch recent updates');
      }
      console.log('Recent updates fetched successfully');
    } catch (err) {
      console.error('Error fetching recent updates:', err);
    } finally {
      console.log('Setting loading to false after fetching recent updates');
      setLoading(false);
    }
  };
  // Fetch metrics when user changes or component mounts
  useEffect(() => {
    console.log('useEffect triggered, user:', user, 'token:', user?.token);
    if (user?.token) {
      console.log('User has token, calling fetchMetrics');
      fetchMetrics();
      fetchRecentUpdates();
    } else {
      console.log(
        'No user token, setting loading to false and clearing metrics'
      );
      setLoading(false);
      setMetrics(null);
    }
  }, [user?.token]); // Only depend on user?.token

  // Refresh metrics function
  const refreshMetrics = () => {
    fetchMetrics();
  };

  const value = {
    metrics,
    loading,
    error,
    refreshMetrics,
    fetchMetrics,
    recentUpdates,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => useContext(DashboardContext);
