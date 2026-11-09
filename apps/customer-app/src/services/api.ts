import * as SecureStore from 'expo-secure-store';
import { createApiClient, StorageAdapter } from '../../../../packages/api-client/src/index';

// Platform SecureStore Adapter for React Native Expo
const expoSecureStorage: StorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('SecureStore set error:', e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('SecureStore remove error:', e);
    }
  },
};

// Default API base URL (configurable via EXPO_PUBLIC_API_URL or local IP / localhost)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  storage: expoSecureStorage,
  tokenKey: 'kirsab_customer_token',
});

