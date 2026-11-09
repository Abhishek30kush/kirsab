import * as SecureStore from 'expo-secure-store';
import { createApiClient, StorageAdapter } from '../../../../packages/api-client/src/index';

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

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = createApiClient({
  baseUrl: API_BASE_URL,
  storage: expoSecureStorage,
  tokenKey: 'kirsab_delivery_token',
});

