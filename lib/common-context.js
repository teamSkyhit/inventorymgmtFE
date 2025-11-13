'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { categoriesAPI, dashboardAPI } from './api';
import { useAuth } from './auth-context';

const CommonContext = createContext({});

export const CommonProvider = ({ children }) => {
  const [loading, setLoading] = useState(false); // Start with false instead of true
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  console.log('CommonProvider render - user:', user);

  // Fetch dashboard metrics - removed useCallback to avoid dependency issues
  const fetchCategories = async () => {
    console.log('fetchCategories called, user token:', user?.token);
    if (!user?.token) {
      console.log('No token, setting loading to false');
      setLoading(false);
      return;
    }

    try {
      console.log('Setting loading to true');
      setLoading(true);
      setError(null);
      console.log('Calling categoriesAPI.getAll...');
      const response = await categoriesAPI.getAll(user.token);
      console.log('API response:', response);

      if (response.success) {
        console.log('Setting categories:', response.data);
        setCategories(response.data);
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
  // Fetch metrics when user changes or component mounts
  useEffect(() => {
    console.log('useEffect triggered, user:', user, 'token:', user?.token);
    if (user?.token) {
      console.log('User has token, calling fetchCategories');
      fetchCategories();
    } else {
      console.log(
        'No user token, setting loading to false and clearing metrics'
      );
      setLoading(false);
      setCategories(null);
    }
  }, [user?.token]); // Only depend on user?.token

  // Refresh categories function
  const refreshCategories = () => {
    fetchCategories();
  };

  const value = {
    categories,
    loading,
    error,
    refreshCategories,
    fetchCategories,
  };

  return (
    <CommonContext.Provider value={value}>{children}</CommonContext.Provider>
  );
};

export const useCommon = () => useContext(CommonContext);
