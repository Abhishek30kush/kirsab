import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../../../packages/shared-types/src/index';
import { api } from '../services/api';

interface AdminAuthContextType {
  admin: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({} as AdminAuthContextType);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAdmin = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user && res.user.role === 'admin') {
        setAdmin(res.user);
      } else {
        setAdmin(null);
      }
    } catch {
      setAdmin(null);
    }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await api.getToken();
        if (token) {
          await refreshAdmin();
        }
      } catch {
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.auth.adminLogin({ email, password: pass });
      if (res.success && res.token) {
        if (res.user && res.user.role !== 'admin') {
          return { success: false, message: 'Unauthorized: Admin accounts only' };
        }
        await api.setToken(res.token);
        setAdmin(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error logging in' };
    }
  };

  const logout = async () => {
    await api.setToken(null);
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        isLoading,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => useContext(AdminAuthContext);

