const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Helper to get stored admin auth token
 */
export const getAdminToken = () => {
  return localStorage.getItem('kirsab_admin_token');
};

/**
 * Helper to set stored admin auth token
 */
export const setAdminToken = (token) => {
  if (token) {
    localStorage.setItem('kirsab_admin_token', token);
  } else {
    localStorage.removeItem('kirsab_admin_token');
  }
};

/**
 * Generic API request wrapper
 */
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAdminToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `API error: ${response.status} ${response.statusText}`);
  }

  return data;
};

// API Services
export const api = {
  // Public
  getProducts: () => apiRequest('/products'),
  getSettings: () => apiRequest('/settings'),
  createOrder: (payload) => apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Admin Auth
  login: (credentials) => apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  getMe: () => apiRequest('/auth/me'),

  // Admin Products
  getAdminProducts: (params = '') => apiRequest(`/products/admin/all${params}`),
  createProduct: (product) => apiRequest('/products/admin', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: (id, product) => apiRequest(`/products/admin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  toggleProductStock: (id) => apiRequest(`/products/admin/${id}/toggle-stock`, {
    method: 'PATCH',
  }),
  deleteProduct: (id) => apiRequest(`/products/admin/${id}`, {
    method: 'DELETE',
  }),

  // Admin Orders
  getAdminOrders: (params = '') => apiRequest(`/orders/admin${params}`),
  getOrderStats: () => apiRequest('/orders/admin/stats'),
  updateOrderStatus: (id, status) => apiRequest(`/orders/admin/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),

  // Admin Settings
  updateSettings: (settings) => apiRequest('/settings/admin', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),
};
