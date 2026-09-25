'use client';

import { createContext, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories } from '@/lib/hooks/useCategories';
import { invalidateFor } from '@/lib/cacheSync';

const CommonContext = createContext({});

export const CommonProvider = ({ children }) => {
  const qc = useQueryClient();
  const { data: categories = null, isLoading: loading, error: queryError } = useCategories();

  // Keep the same interface so all existing pages using useCommon() need no changes
  // Category/subcategory edits also change product data (names, brass pricing).
  const refreshCategories = () => invalidateFor(qc, 'category');

  const value = {
    categories,
    loading,
    error: queryError?.message || null,
    refreshCategories,
    fetchCategories: refreshCategories,
  };

  return (
    <CommonContext.Provider value={value}>{children}</CommonContext.Provider>
  );
};

export const useCommon = () => useContext(CommonContext);
