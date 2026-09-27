'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from './auth-context';
import { authAPI } from './api';
import logger from './logger';
import { toast } from 'sonner';

const SessionTimeoutContext = createContext({});

export const SessionTimeoutProvider = ({ children }) => {
  const [isSessionTimeoutOpen, setIsSessionTimeoutOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(null);
  const { user, logout } = useAuth();

  const showSessionTimeout = useCallback((requestCallback = null) => {
    // Don't show if user is not authenticated (e.g. already on login page)
    if (!user?.token) return;
    setIsSessionTimeoutOpen(true);
    if (requestCallback) {
      setPendingRequest(requestCallback);
    }
  }, [user]);

  const hideSessionTimeout = useCallback(() => {
    setIsSessionTimeoutOpen(false);
    setPendingRequest(null);
  }, []);

  const handleRefreshSession = useCallback(async () => {
    if (!user?.token) {
      hideSessionTimeout();
      logout();
      return;
    }

    setIsRefreshing(true);
    try {
      // Call validate directly with fetch to bypass the apiCall 401 handler
      // (apiCall would re-trigger showSessionTimeout on 401, causing a loop)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || ''}/api/auth/validate`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        logger.info('Session refreshed successfully');
        hideSessionTimeout();
        if (pendingRequest) {
          try { await pendingRequest(); } catch {}
          setPendingRequest(null);
        }
      } else {
        // 401 or any error — token is dead, force logout
        logger.warn('Token validation failed, redirecting to login');
        toast.error('Session expired. Please login again.');
        hideSessionTimeout();
        logout();
      }
    } catch (error) {
      logger.error('Session refresh failed:', error);
      toast.error('Unable to refresh session. Please login again.');
      hideSessionTimeout();
      logout();
    } finally {
      setIsRefreshing(false);
    }
  }, [user, logout, hideSessionTimeout, pendingRequest]);

  const handleLogout = useCallback(() => {
    hideSessionTimeout();
    logout();
  }, [hideSessionTimeout, logout]);

  return (
    <SessionTimeoutContext.Provider
      value={{
        isSessionTimeoutOpen,
        isRefreshing,
        showSessionTimeout,
        hideSessionTimeout,
        handleRefreshSession,
        handleLogout,
      }}
    >
      {children}
    </SessionTimeoutContext.Provider>
  );
};

export const useSessionTimeout = () => useContext(SessionTimeoutContext);

