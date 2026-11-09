import {
  ApiResponse,
  Category,
  CustomerAddress,
  Offer,
  Order,
  Product,
  Review,
  ReviewStats,
  StoreSettings,
  User,
} from '@kirsab/shared-types';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

// In-memory token storage fallback
let inMemoryToken: string | null = null;
const memoryStorage: StorageAdapter = {
  getItem: () => inMemoryToken,
  setItem: (_, val) => {
    inMemoryToken = val;
  },
  removeItem: () => {
    inMemoryToken = null;
  },
};

export class KirsabApiClient {
  private baseUrl: string;
  private storage: StorageAdapter;
  private tokenKey: string;

  constructor(options: {
    baseUrl?: string;
    storage?: StorageAdapter;
    tokenKey?: string;
  } = {}) {
    // Default to localhost or production API
    this.baseUrl = (options.baseUrl || 'http://localhost:5000/api').replace(/\/+$/, '');
    this.storage = options.storage || memoryStorage;
    this.tokenKey = options.tokenKey || 'kirsab_auth_token';
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
  }

  public getBaseUrl() {
    return this.baseUrl;
  }

  public async setToken(token: string | null) {
    if (token) {
      await this.storage.setItem(this.tokenKey, token);
    } else {
      await this.storage.removeItem(this.tokenKey);
    }
  }

  public async getToken(): Promise<string | null> {
    return await this.storage.getItem(this.tokenKey);
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = await this.getToken();

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data as ApiResponse<T>;
    } catch (err: any) {
      throw new Error(err.message || 'नेटवर्क त्रुटि: सर्वर से कनेक्ट नहीं हो सका (Network Error)');
    }
  }

  // ==================== AUTH APIs ====================
  public auth = {
    adminLogin: (credentials: { email: string; password: string }) =>
      this.request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    customerLogin: (credentials: { identifier: string; password: string }) =>
      this.request<{ token: string; user: User }>('/auth/customer/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    customerRegister: (data: { name: string; phone: string; password: string; email?: string }) =>
      this.request<{ token: string; user: User }>('/auth/customer/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    deliveryLogin: (credentials: { identifier: string; password: string }) =>
      this.request<{ token: string; partner: User }>('/auth/delivery/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    getMe: () => this.request<{ user: User }>('/auth/me'),
  };

  // ==================== PRODUCTS APIs ====================
  public products = {
    getPublic: () => this.request<Product[]>('/products'),
    getCategories: () => this.request<{ categories: Category[] }>('/products/categories'),
    getReviews: (productId: string) =>
      this.request<{ reviews: Review[]; stats: any }>(`/products/${productId}/reviews`),
  };

  // ==================== OFFERS APIs ====================
  public offers = {
    getActive: () => this.request<Offer[]>('/offers/active'),
  };

  // ==================== SETTINGS APIs ====================
  public settings = {
    getPublic: () => this.request<StoreSettings>('/settings'),
  };

  // ==================== ORDER PLACEMENT APIs ====================
  public orders = {
    placeOrder: (payload: {
      customer: {
        fullName: string;
        phone: string;
        address: string;
        landmark?: string;
        deliverySlot: string;
        instructions?: string;
      };
      items: { productId: string; quantity: number }[];
    }) =>
      this.request<{ order: Order }>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };

  // ==================== CUSTOMER PORTAL APIs ====================
  public customer = {
    getProfile: () => this.request<{ profile: User & { orderCount: number } }>('/customer/profile'),
    updateProfile: (data: { name?: string; email?: string }) =>
      this.request<{ profile: User }>('/customer/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    getAddresses: () => this.request<{ addresses: CustomerAddress[] }>('/customer/addresses'),
    createAddress: (address: Omit<CustomerAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
      this.request<{ address: CustomerAddress }>('/customer/addresses', {
        method: 'POST',
        body: JSON.stringify(address),
      }),
    updateAddress: (id: string, address: Partial<CustomerAddress>) =>
      this.request<{ address: CustomerAddress }>(`/customer/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(address),
      }),
    deleteAddress: (id: string) =>
      this.request(`/customer/addresses/${id}`, {
        method: 'DELETE',
      }),

    getOrders: () => this.request<{ orders: Order[] }>('/customer/orders'),
    getOrderById: (id: string) => this.request<{ order: Order }>(`/customer/orders/${id}`),
    getDeliveryPartner: (id: string) =>
      this.request<{
        orderNumber: string;
        isAssigned: boolean;
        status: string;
        deliveryPartner?: {
          id: string;
          name: string;
          phone: string;
          vehicleType?: string;
          vehicleNumber?: string;
        };
        message: string;
      }>(`/customer/orders/${id}/delivery-partner`),
    cancelOrder: (id: string, reason?: string) =>
      this.request(`/customer/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    getWishlist: () => this.request<{ items: Product[]; productIds: string[] }>('/customer/wishlist'),
    toggleWishlist: (productId: string) =>
      this.request<{ isWishlisted: boolean; message: string }>('/customer/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      }),

    updatePushToken: (pushToken: string) =>
      this.request('/customer/push-token', {
        method: 'POST',
        body: JSON.stringify({ pushToken }),
      }),
  };

  // ==================== REVIEWS APIs ====================
  public reviews = {
    getPublic: (params?: { page?: number; limit?: number; rating?: number; sort?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return this.request<{ reviews: Review[]; total: number }>(`/reviews${q ? `?${q}` : ''}`);
    },
    getFeatured: () => this.request<{ reviews: Review[] }>('/reviews/featured'),
    getStats: () => this.request<{ stats: ReviewStats }>('/reviews/stats'),
    getMyReviews: () => this.request<{ reviews: Review[] }>('/reviews/my-reviews'),
    getEligibleOrders: () => this.request<{ eligibleOrders: any[] }>('/reviews/eligible-orders'),
    submitReview: (payload: {
      orderId: string;
      productId?: string;
      rating: number;
      title?: string;
      comment: string;
      productQualityRating?: number;
      packagingRating?: number;
      deliveryRating?: number;
      images?: string[];
    }) =>
      this.request<{ review: Review }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateReview: (reviewId: string, payload: any) =>
      this.request<{ review: Review }>(`/reviews/${reviewId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  };

  // ==================== DELIVERY PARTNER APIs ====================
  public delivery = {
    getOrders: (status: 'active' | 'delivered' | 'cancelled' | 'all' = 'active') =>
      this.request<{ orders: Order[] }>(`/delivery/orders?status=${status}`),
    getOrderById: (id: string) => this.request<{ order: Order }>(`/delivery/orders/${id}`),
    acceptOrder: (id: string) =>
      this.request<{ order: Order }>(`/delivery/orders/${id}/accept`, {
        method: 'POST',
      }),
    pickupOrder: (id: string) =>
      this.request<{ order: Order }>(`/delivery/orders/${id}/pickup`, {
        method: 'POST',
      }),
    markOutForDelivery: (id: string) =>
      this.request<{ order: Order }>(`/delivery/orders/${id}/out-for-delivery`, {
        method: 'POST',
      }),
    verifyPinAndDeliver: (id: string, pin: string) =>
      this.request<{ order: Order }>(`/delivery/orders/${id}/verify-pin`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      }),
    toggleAvailability: (isAvailable?: boolean) =>
      this.request<{ isAvailable: boolean }>('/delivery/availability', {
        method: 'POST',
        body: JSON.stringify({ isAvailable }),
      }),
    updatePushToken: (pushToken: string) =>
      this.request('/delivery/push-token', {
        method: 'POST',
        body: JSON.stringify({ pushToken }),
      }),
  };

  // ==================== ADMIN APIs ====================
  public admin = {
    // Orders
    getOrders: (params?: any) => {
      const q = new URLSearchParams(params || {}).toString();
      return this.request<{ orders: Order[]; totalCount: number }>(`/orders/admin${q ? `?${q}` : ''}`);
    },
    getOrderById: (id: string) => this.request<{ order: Order }>(`/orders/admin/${id}`),
    updateOrderStatus: (id: string, status: string, notes?: string) =>
      this.request<{ order: Order }>(`/orders/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }),
    getStats: () => this.request<any>('/orders/admin/stats'),
    getAnalytics: () => this.request<any>('/orders/admin/analytics'),
    getLiveOrders: () => this.request<{ liveOrders: Order[] }>('/orders/admin/live'),

    // Delivery Partner Management & Assignment
    getPartners: () => this.request<{ partners: User[] }>('/admin/delivery/partners'),
    createPartner: (data: any) =>
      this.request<{ partner: User }>('/admin/delivery/partners', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updatePartner: (id: string, data: any) =>
      this.request<{ partner: User }>(`/admin/delivery/partners/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    resetPartnerPassword: (id: string, password?: string) =>
      this.request<any>(`/admin/delivery/partners/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      }),
    assignOrderDelivery: (orderId: string, partnerId: string, notes?: string) =>
      this.request<{ order: Order }>(`/admin/delivery/orders/${orderId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ partnerId, notes }),
      }),
    removeOrderDelivery: (orderId: string) =>
      this.request(`/admin/delivery/orders/${orderId}/delivery-partner`, {
        method: 'DELETE',
      }),

    // Products Management
    getAllProducts: (params?: any) => {
      const q = new URLSearchParams(params || {}).toString();
      return this.request<{ data: Product[]; categories: Category[] }>(`/products/admin/all${q ? `?${q}` : ''}`);
    },
    createProduct: (data: any) =>
      this.request<{ product: Product }>('/products/admin', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProduct: (id: string, data: any) =>
      this.request<{ product: Product }>(`/products/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleProductStock: (id: string) =>
      this.request<{ product: Product }>(`/products/admin/${id}/toggle-stock`, {
        method: 'PATCH',
      }),
    deleteProduct: (id: string) =>
      this.request(`/products/admin/${id}`, {
        method: 'DELETE',
      }),

    // Pricing & Profit Calculator
    calculatePricing: (data: any) =>
      this.request<any>('/pricing/calculate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    applyPrice: (productId: string, price: number) =>
      this.request<any>('/pricing/apply-price', {
        method: 'POST',
        body: JSON.stringify({ productId, price }),
      }),

    // Offers & Coupons
    getAllOffers: () => this.request<{ offers: Offer[] }>('/offers/admin'),
    createOffer: (data: any) =>
      this.request<{ offer: Offer }>('/offers/admin', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateOffer: (id: string, data: any) =>
      this.request<{ offer: Offer }>(`/offers/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleOfferStatus: (id: string) =>
      this.request<{ offer: Offer }>(`/offers/admin/${id}/toggle-status`, {
        method: 'PATCH',
      }),
    deleteOffer: (id: string) =>
      this.request(`/offers/admin/${id}`, {
        method: 'DELETE',
      }),

    // Review Moderation
    getReviews: (params?: any) => {
      const q = new URLSearchParams(params || {}).toString();
      return this.request<{ reviews: Review[]; total: number }>(`/admin/reviews${q ? `?${q}` : ''}`);
    },
    updateReviewStatus: (reviewId: string, status: string) =>
      this.request<{ review: Review }>(`/admin/reviews/${reviewId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    toggleReviewFeature: (reviewId: string) =>
      this.request<{ review: Review }>(`/admin/reviews/${reviewId}/feature`, {
        method: 'PATCH',
      }),
    replyToReview: (reviewId: string, reply: string) =>
      this.request<{ review: Review }>(`/admin/reviews/${reviewId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply }),
      }),
    deleteReview: (reviewId: string) =>
      this.request(`/admin/reviews/${reviewId}`, {
        method: 'DELETE',
      }),

    // Customer Management
    getCustomers: (params?: { search?: string }) => {
      const q = new URLSearchParams(params || {}).toString();
      return this.request<{ customers: any[]; total: number }>(`/customer/admin/list${q ? `?${q}` : ''}`);
    },
    getCustomerDetails: (id: string) =>
      this.request<{ customer: any }>(`/customer/admin/${id}`),
  };
}

export const createApiClient = (options?: {
  baseUrl?: string;
  storage?: StorageAdapter;
  tokenKey?: string;
}) => new KirsabApiClient(options);

