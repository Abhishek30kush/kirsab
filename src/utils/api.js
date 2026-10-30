const DEFAULT_PROD_API = 'https://kirsab-backend.onrender.com/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? DEFAULT_PROD_API 
    : 'http://localhost:5000/api');

export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Token Helpers
 */
export const getAdminToken = () => localStorage.getItem('kirsab_admin_token');

export const getAdminUser = () => {
  try {
    const raw = localStorage.getItem('kirsab_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAdminUser = (user) => {
  if (user) localStorage.setItem('kirsab_admin_user', JSON.stringify(user));
  else localStorage.removeItem('kirsab_admin_user');
};

export const getAdminActiveState = () => {
  try {
    return localStorage.getItem('kirsab_admin_active') === 'true';
  } catch {
    return false;
  }
};

export const setAdminActiveState = (isActive) => {
  if (isActive) localStorage.setItem('kirsab_admin_active', 'true');
  else localStorage.removeItem('kirsab_admin_active');
};

export const clearAdminSession = () => {
  localStorage.removeItem('kirsab_admin_token');
  localStorage.removeItem('kirsab_admin_user');
  localStorage.removeItem('kirsab_admin_active');
};

export const setAdminToken = (token) => {
  if (token) {
    localStorage.setItem('kirsab_admin_token', token);
  } else {
    clearAdminSession();
  }
};

export const getCustomerToken = () => localStorage.getItem('kirsab_customer_token');
export const setCustomerToken = (token) => {
  if (token) localStorage.setItem('kirsab_customer_token', token);
  else localStorage.removeItem('kirsab_customer_token');
};

export const getDeliveryToken = () => localStorage.getItem('kirsab_delivery_token');
export const setDeliveryToken = (token) => {
  if (token) localStorage.setItem('kirsab_delivery_token', token);
  else localStorage.removeItem('kirsab_delivery_token');
};

/**
 * Generic API request wrapper with intelligent role-based token resolution
 */
export const apiRequest = async (endpoint, options = {}) => {
  let token = options.token;

  if (!token) {
    if (endpoint.startsWith('/customer')) {
      token = getCustomerToken();
    } else if (endpoint.startsWith('/delivery')) {
      token = getDeliveryToken();
    } else if (endpoint === '/orders' && options.method === 'POST') {
      token = getCustomerToken();
    } else if (
      endpoint.startsWith('/admin') ||
      endpoint.startsWith('/pricing') ||
      endpoint.includes('/admin') ||
      endpoint === '/auth/me'
    ) {
      token = getAdminToken();
    }
  }

  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    cache: isGet ? 'no-store' : 'default',
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
  // Public Store
  getProducts: () => apiRequest('/products'),
  getSettings: () => apiRequest('/settings'),
  getPublicOrderStats: () => apiRequest('/orders/public-stats'),
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

  // Customer Auth & Portal (Module 1 & 2)
  customerRegister: (payload) => apiRequest('/auth/customer/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  customerLogin: (payload) => apiRequest('/auth/customer/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getCustomerProfile: () => apiRequest('/customer/profile'),
  updateCustomerProfile: (payload) => apiRequest('/customer/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  getCustomerAddresses: () => apiRequest('/customer/addresses'),
  createCustomerAddress: (address) => apiRequest('/customer/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  }),
  updateCustomerAddress: (id, address) => apiRequest(`/customer/addresses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(address),
  }),
  deleteCustomerAddress: (id) => apiRequest(`/customer/addresses/${id}`, {
    method: 'DELETE',
  }),
  getCustomerOrders: () => apiRequest('/customer/orders'),
  getCustomerOrderById: (id) => apiRequest(`/customer/orders/${id}`),
  cancelCustomerOrder: (id, reason) => apiRequest(`/customer/orders/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  }),

  // Delivery Partner Auth & Portal (Module 3 & 4)
  deliveryLogin: (payload) => apiRequest('/auth/delivery/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getAssignedDeliveryOrders: (status = 'all') => apiRequest(`/delivery/orders?status=${status}`),
  getDeliveryOrderById: (id) => apiRequest(`/delivery/orders/${id}`),
  acceptDeliveryOrder: (id) => apiRequest(`/delivery/orders/${id}/accept`, {
    method: 'POST',
  }),
  pickupDeliveryOrder: (id) => apiRequest(`/delivery/orders/${id}/pickup`, {
    method: 'POST',
  }),
  outForDeliveryOrder: (id) => apiRequest(`/delivery/orders/${id}/out-for-delivery`, {
    method: 'POST',
  }),
  verifyDeliveryPin: (id, pin) => apiRequest(`/delivery/orders/${id}/verify-pin`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  }),

  // Admin Delivery Management (Module 5)
  getDeliveryPartners: () => apiRequest('/admin/delivery/partners'),
  createDeliveryPartner: (payload) => apiRequest('/admin/delivery/partners', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateDeliveryPartner: (id, payload) => apiRequest(`/admin/delivery/partners/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  resetDeliveryPartnerPassword: (id, password = '') => apiRequest(`/admin/delivery/partners/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  }),
  assignOrderDelivery: (orderId, partnerId, notes = '') => apiRequest(`/orders/admin/${orderId}/assign-delivery`, {
    method: 'POST',
    body: JSON.stringify({ partnerId, notes }),
  }),
  getOrderDeliveryAudit: (orderId) => apiRequest(`/orders/admin/${orderId}/delivery-history`),

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

  // Admin Orders & Analytics
  getAdminOrders: (params = '') => apiRequest(`/orders/admin${params}`),
  getOrderStats: () => apiRequest('/orders/admin/stats'),
  getOrderAnalytics: () => apiRequest('/orders/admin/analytics'),
  getLiveOrders: (params = '') => apiRequest(`/orders/admin/live${params}`),
  getOrderHistory: (id) => apiRequest(`/orders/admin/${id}/history`),
  updateOrderStatus: (id, status, notes = '') => apiRequest(`/orders/admin/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  }),

  // Admin Settings
  updateSettings: (settings) => apiRequest('/settings/admin', {
    method: 'PUT',
    body: JSON.stringify(settings),
  }),

  // Admin Vegetable Pricing Calculator
  calculatePricing: (payload) => apiRequest('/pricing/calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  savePricingCalculation: (payload) => apiRequest('/pricing/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getPricingOverview: () => apiRequest('/pricing/overview'),
  getPricingHistory: (productId = 'all') => apiRequest(`/pricing/history/${productId}`),
  applyProductPrice: (payload) => apiRequest('/pricing/apply-price', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  bulkCalculatePricing: (payload) => apiRequest('/pricing/bulk-calculate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  bulkApplyPricing: (payload) => apiRequest('/pricing/bulk-apply', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  saveCompetitorPrice: (payload) => apiRequest('/pricing/competitors', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Vegetable Offers & Discounts
  getActiveOffers: () => apiRequest('/offers/active'),
  getAdminOffers: (params = '') => apiRequest(`/offers/admin${params}`),
  getAdminOfferById: (id) => apiRequest(`/offers/admin/${id}`),
  previewOffer: (payload) => apiRequest('/offers/admin/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  createOffer: (payload) => apiRequest('/offers/admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateOffer: (id, payload) => apiRequest(`/offers/admin/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  toggleOfferStatus: (id) => apiRequest(`/offers/admin/${id}/toggle-status`, {
    method: 'PATCH',
  }),
  deleteOffer: (id) => apiRequest(`/offers/admin/${id}`, {
    method: 'DELETE',
  }),
};

