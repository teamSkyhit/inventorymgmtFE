'use client';

import { useEffect } from 'react';
import { useSessionTimeout } from '@/lib/session-timeout-context';
import { setSessionTimeoutHandler } from '@/lib/api';
import SessionTimeoutModal from './session-timeout-modal';

export default function SessionTimeoutHandler() {
  const {
    isSessionTimeoutOpen,
    isRefreshing,
    showSessionTimeout,
    handleRefreshSession,
    handleLogout,
  } = useSessionTimeout();

  useEffect(() => {
    // Register the session timeout handler with the API
    setSessionTimeoutHandler(showSessionTimeout);
    
    return () => {
      // Cleanup: unregister handler
      setSessionTimeoutHandler(null);
    };
  }, [showSessionTimeout]);

  return (
    <SessionTimeoutModal
      open={isSessionTimeoutOpen}
      onRefresh={handleRefreshSession}
      onLogout={handleLogout}
      isRefreshing={isRefreshing}
    />
  );
}

