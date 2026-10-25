import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  api,
  getCustomerToken,
  setCustomerToken,
  SOCKET_URL,
} from '../utils/api';
import { io } from 'socket.io-client';

const CustomerContext = createContext(null);

export const CustomerProvider = ({ children }) => {
  const [customerUser, setCustomerUser] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCustomerPortalOpen, setIsCustomerPortalOpen] = useState(false);
  const [activePortalTab, setActivePortalTab] = useState('orders'); // 'orders', 'addresses', 'profile'
  const [socket, setSocket] = useState(null);

  // Load customer profile and addresses
  const refreshCustomerData = useCallback(async () => {
    const token = getCustomerToken();
    if (!token) {
      setCustomerUser(null);
      setAddresses([]);
      setOrders([]);
      setIsLoadingAuth(false);
      return;
    }

    try {
      const res = await api.getCustomerProfile();
      if (res.success && res.profile) {
        setCustomerUser(res.profile);
        setAddresses(res.profile.addresses || []);
      }
    } catch (err) {
      console.warn('Failed to load customer profile, clearing session:', err.message);
      setCustomerToken(null);
      setCustomerUser(null);
      setAddresses([]);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  // Fetch customer orders
  const refreshCustomerOrders = useCallback(async () => {
    if (!getCustomerToken()) return;
    try {
      const res = await api.getCustomerOrders();
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshCustomerData();
  }, [refreshCustomerData]);

  // When customer is logged in, refresh orders & establish authenticated Socket.IO connection
  useEffect(() => {
    if (!customerUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    refreshCustomerOrders();

    const token = getCustomerToken();
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      // Authenticated customer room joined on backend
    });

    // Real-time order updates for this customer
    newSocket.on('customer:order_created', (data) => {
      if (data && data.order) {
        setOrders((prev) => [data.order, ...prev.filter((o) => o.id !== data.order.id)]);
      }
    });

    newSocket.on('customer:order_updated', (data) => {
      if (data && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o))
        );
      }
    });

    newSocket.on('order:live_status', (data) => {
      if (data && data.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === data.order.id ? { ...o, ...data.order } : o))
        );
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [customerUser, refreshCustomerOrders]);

  // Login handler
  const loginCustomer = async (identifier, password) => {
    const res = await api.customerLogin({ identifier, password });
    if (res.success && res.token) {
      setCustomerToken(res.token);
      setCustomerUser(res.user);
      setAddresses(res.user.addresses || []);
      setIsAuthModalOpen(false);
      refreshCustomerOrders();
      return res.user;
    }
    throw new Error(res.message || 'लॉगिन विफल (Login failed)');
  };

  // Register handler
  const registerCustomer = async (payload) => {
    const res = await api.customerRegister(payload);
    if (res.success && res.token) {
      setCustomerToken(res.token);
      setCustomerUser(res.user);
      setIsAuthModalOpen(false);
      refreshCustomerData();
      return res.user;
    }
    throw new Error(res.message || 'पंजीकरण विफल (Registration failed)');
  };

  // Logout handler
  const logoutCustomer = () => {
    setCustomerToken(null);
    setCustomerUser(null);
    setAddresses([]);
    setOrders([]);
    setIsCustomerPortalOpen(false);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  // Default address helper
  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0] || null;

  return (
    <CustomerContext.Provider
      value={{
        customerUser,
        addresses,
        defaultAddress,
        orders,
        isLoadingAuth,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isCustomerPortalOpen,
        setIsCustomerPortalOpen,
        activePortalTab,
        setActivePortalTab,
        loginCustomer,
        registerCustomer,
        logoutCustomer,
        refreshCustomerData,
        refreshCustomerOrders,
        socket,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
};
