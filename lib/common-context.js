'use client';

import { createContext, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCategories } from '@/lib/hooks/useCategories';
import { queryKeys } from '@/lib/queryKeys';

const CommonContext = createContext({});

export const CommonProvider = ({ children }) => {
  const qc = useQueryClient();
  const { data: categories = null, isLoading: loading, error: queryError } = useCategories();

  // Keep the same interface so all existing pages using useCommon() need no changes
  const refreshCategories = () => {
    qc.invalidateQueries({ queryKey: queryKeys.categories() });
  };

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
