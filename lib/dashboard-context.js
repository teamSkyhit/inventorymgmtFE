'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardAPI } from './api';
import { useAuth } from './auth-context';
import logger from './logger';

const DashboardContext = createContext({});

export const DashboardProvider = ({ children }) => {
  const [metrics, setMetrics] = useState(null);
  const [recentUpdates, setRecentUpdates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  const fetchMetrics = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await dashboardAPI.getMetrics(user.token);

      if (response.success) {
        setMetrics(response.data);
      } else {
        setError(response.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      logger.error('Error fetching dashboard metrics:', err);
      setError(err.message || 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentUpdates = async () => {
    if (!user?.token) {
      return;
    }
    try {
      setLoading(true);
      const response = await dashboardAPI.getRecentUpdates(user.token);
      if (response.success) {
        setRecentUpdates(response.data);
      } else {
        setError(response.message || 'Failed to fetch recent updates');
      }
    } catch (err) {
      logger.error('Error fetching recent updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchMetrics();
      fetchRecentUpdates();
    } else {
      setLoading(false);
      setMetrics(null);
    }
  }, [user?.token]);

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
