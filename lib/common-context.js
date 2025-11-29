'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { categoriesAPI } from './api';
import { useAuth } from './auth-context';
import logger from './logger';

const CommonContext = createContext({});

export const CommonProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState(null);
  const { user } = useAuth();

  const fetchCategories = async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await categoriesAPI.getAll(user.token);

      if (response.success) {
        setCategories(response.data);
      } else {
        setError(response.message || 'Failed to fetch categories');
      }
    } catch (err) {
      logger.error('Error fetching categories:', err);
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchCategories();
    } else {
      setLoading(false);
      setCategories(null);
    }
  }, [user?.token]);

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
