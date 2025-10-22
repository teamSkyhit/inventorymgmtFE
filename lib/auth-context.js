'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from './api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    try {
      // Call external API server using the utility function
      const data = await authAPI.login(email, password, role);

      if (data.success) {
        const userData = {
          id: data?.data?.user.id,
          email: data?.data?.user.email,
          role: data?.data?.user.role,
          name: data?.data?.user.name,
          token: data?.data?.token,
        };
        // const userData = { email, role, name: data.name, token: data.token };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));

        // Redirect based on role
        if (userData.role.toLowerCase() === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/scan');
        }

        return { success: true };
      }

      return { success: false, message: data.message };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message:
          error.message === 'Failed to fetch'
            ? 'Unable to connect to server. Please check if the server is running.'
            : 'Login failed',
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
