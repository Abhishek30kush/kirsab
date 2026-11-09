import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../../../../packages/shared-types/src/index';
import { api } from '../services/api';

interface DeliveryAuthContextType {
  partner: User | null;
  isAuthenticated: boolean;
  isAvailable: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  toggleAvailability: () => Promise<void>;
  logout: () => Promise<void>;
  refreshPartner: () => Promise<void>;
}

const DeliveryAuthContext = createContext<DeliveryAuthContextType>({} as DeliveryAuthContextType);

export const DeliveryAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partner, setPartner] = useState<User | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPartner = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.user && res.user.role === 'delivery_partner') {
        setPartner(res.user);
        setIsAvailable(res.user.isAvailable ?? true);
      } else {
        setPartner(null);
      }
    } catch {
      setPartner(null);
    }
  };

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await api.getToken();
        if (token) {
          await refreshPartner();
        }
      } catch {
        setPartner(null);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await api.auth.deliveryLogin({ identifier, password: pass });
      if (res.success && res.token) {
        await api.setToken(res.token);
        setPartner(res.partner);
        setIsAvailable(res.partner.isAvailable ?? true);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error logging in' };
    }
  };

  const toggleAvailability = async () => {
    try {
      const next = !isAvailable;
      const res = await api.delivery.toggleAvailability(next);
      if (res.success) {
        setIsAvailable(res.isAvailable);
      }
    } catch (e) {
      console.warn('Error toggling availability:', e);
    }
  };

  const logout = async () => {
    await api.setToken(null);
    setPartner(null);
  };

  return (
    <DeliveryAuthContext.Provider
      value={{
        partner,
        isAuthenticated: !!partner,
        isAvailable,
        isLoading,
        login,
        toggleAvailability,
        logout,
        refreshPartner,
      }}
    >
      {children}
    </DeliveryAuthContext.Provider>
  );
};

export const useDeliveryAuth = () => useContext(DeliveryAuthContext);

