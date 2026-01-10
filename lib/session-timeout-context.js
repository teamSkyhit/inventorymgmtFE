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
    setIsSessionTimeoutOpen(true);
    if (requestCallback) {
      setPendingRequest(requestCallback);
    }
  }, []);

  const hideSessionTimeout = useCallback(() => {
    setIsSessionTimeoutOpen(false);
    setPendingRequest(null);
  }, []);

  const handleRefreshSession = useCallback(async () => {
    if (!user?.token) {
      logger.error('No token available for refresh');
      logout();
      return;
    }

    setIsRefreshing(true);
    try {
      // Try to validate the token (this will refresh if the backend supports it)
      const response = await authAPI.validateToken(user.token);
      
      if (response?.success) {
        // Token is still valid, just refresh the session
        logger.info('Session refreshed successfully');
        hideSessionTimeout();
        
        // Retry the pending request if there is one
        if (pendingRequest) {
          try {
            const retryResponse = await pendingRequest();
            // If retry also fails with 401, show the modal again
            if (retryResponse?.sessionExpired) {
              showSessionTimeout(pendingRequest);
            }
          } catch (error) {
            logger.error('Failed to retry request after session refresh:', error);
            // Check if it's a 401 error
            if (error?.response?.status === 401 || error?.message?.includes('401')) {
              showSessionTimeout(pendingRequest);
            }
          }
          setPendingRequest(null);
        }
      } else {
        // Token validation failed, need to re-login
        logger.warn('Token validation failed, redirecting to login');
        toast.error('Session expired. Please login again.');
        logout();
      }
    } catch (error) {
      logger.error('Session refresh failed:', error);
      // If refresh fails, logout
      toast.error('Unable to refresh session. Please login again.');
      logout();
    } finally {
      setIsRefreshing(false);
    }
  }, [user, logout, hideSessionTimeout, pendingRequest, showSessionTimeout]);

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

