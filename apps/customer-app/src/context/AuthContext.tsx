import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../../../packages/shared-types/src/index';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  register: (data: { name: string; phone: string; password: string; email?: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      const res = await api.customer.getProfile();
      if (res.success && res.profile) {
        setUser(res.profile);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await api.getToken();
        if (token) {
          await refreshProfile();
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await api.auth.customerLogin({ identifier, password: pass });
      if (res.success && res.token) {
        await api.setToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error logging in' };
    }
  };

  const register = async (data: { name: string; phone: string; password: string; email?: string }) => {
    try {
      const res = await api.auth.customerRegister(data);
      if (res.success && res.token) {
        await api.setToken(res.token);
        setUser(res.user);
        return { success: true };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error registering' };
    }
  };

  const logout = async () => {
    await api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

