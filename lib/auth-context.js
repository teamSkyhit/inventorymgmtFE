'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from './api';
import logger from './logger';

const AuthContext = createContext({});

// Helper to decode JWT token
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Check if token is expired or will expire soon (within 5 minutes)
const isTokenExpiringSoon = (token) => {
  if (!token) return true;
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  return expirationTime < fiveMinutesFromNow;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Validate token on app load
  const validateToken = useCallback(async (token) => {
    if (!token) return false;
    
    try {
      const response = await authAPI.validateToken(token);
      return response?.success === true;
    } catch (error) {
      logger.error('Token validation failed:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed?.role) parsed.role = String(parsed.role).toLowerCase();
          
          // Validate token
          if (parsed?.token) {
            const isValid = await validateToken(parsed.token);
            if (isValid) {
              setUser(parsed);
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('user');
              logger.warn('Invalid token, clearing user data');
            }
          } else {
            // No token, clear user
            localStorage.removeItem('user');
          }
        } catch (e) {
          logger.error('Failed to parse stored user', e);
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [validateToken]);

  const login = async (email, password, role) => {
    try {
      const data = await authAPI.login(email, password, role);

      logger.log('Login response received');

      if (data && data.success) {
        const userData = {
          id: data?.data?.user?.id || data?.user?.id,
          email: data?.data?.user?.email || data?.user?.email,
          role: (data?.data?.user?.role || data?.user?.role || 'USER').toLowerCase(),
          name: data?.data?.user?.name || data?.user?.name,
          token: data?.data?.token || data?.token,
        };

        // Validate that we have required fields
        if (!userData.email || !userData.token) {
          logger.error('Missing required user data');
          return { 
            success: false, 
            message: 'Invalid response from server' 
          };
        }

        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        // Redirect based on role
        const userRole = userData.role.toLowerCase();
        if (userRole === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/scan');
        }

        return { success: true };
      }

      const errorMessage = data?.error || data?.message || 'Login failed';
      logger.error('Login failed:', errorMessage);
      return { 
        success: false, 
        message: errorMessage
      };
    } catch (error) {
      logger.error('Login error:', error);
      return {
        success: false,
        message:
          error.message === 'Failed to fetch'
            ? 'Unable to connect to server. Please check if the server is running.'
            : error.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
