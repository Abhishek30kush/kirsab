/**
 * ==============================================================================
 * KIRSAB SHARED TYPES & DATA CONTRACTS
 * Authoritative TypeScript interfaces matching PostgreSQL Prisma models & API responses
 * ==============================================================================
 */

export type Role = 'customer' | 'delivery_partner' | 'admin';

export interface User {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: Role;
  isActive: boolean;
  isAvailable?: boolean;
  pushToken?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface CustomerAddress {
  id: string;
  userId: string;
  label: 'Home' | 'Work' | 'Other' | string;
  flatNumber: string;
  street: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  deliveryInstructions?: string | null;
  isDefault: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface Category {
  id: string;
  nameHi: string;
  nameEn: string;
  displayOrder: number;
  _count?: {
    products?: number;
  };
}

export interface ProductUnit {
  unit: string;
  unitHindi: string;
  unitShort: string;
}

export interface Product {
  id: string;
  nameEn: string;
  nameHi: string;
  categoryId: string;
  category?: Category;
  unit: string;
  unitHindi: string;
  unitShort: string;
  price: number | null;
  isConfigured: boolean;
  inStock: boolean;
  isActive: boolean;
  stockQuantity: number;
  badge?: string | null;
  description?: string | null;
  image: string;
  fallbackEmoji?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
  // Computed fields from API
  hasActiveOffer?: boolean;
  discountedPrice?: number | null;
  originalPrice?: number | null;
  discountAmount?: number;
  appliedOfferTitle?: string | null;
  averageRating?: number | null;
  reviewsCount?: number;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'packed'
  | 'ready_for_dispatch'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string | null;
  productNameEn: string;
  productNameHi: string;
  unit: string;
  unitPrice: number;
  originalUnitPrice?: number | null;
  discountPerUnit?: number;
  discountAmount?: number;
  offerId?: string | null;
  offerTitle?: string | null;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus?: string | null;
  newStatus: OrderStatus | string;
  changedBy: string;
  notes?: string | null;
  createdAt: string | Date;
}

export interface DeliveryVerificationAudit {
  id: string;
  orderId: string;
  partnerId?: string | null;
  actionType: string;
  success: boolean;
  attemptCount: number;
  notes?: string | null;
  createdAt: string | Date;
}

export interface AssignedDeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  landmark?: string | null;
  deliverySlot: string;
  instructions?: string | null;
  subtotal: number;
  discountTotal: number;
  deliveryFee: number;
  finalTotal: number;
  status: OrderStatus;
  paymentMethod: 'cod' | 'online' | string;
  paymentStatus: 'pending' | 'completed' | 'failed' | string;
  customerId?: string | null;
  deliveryPartnerId?: string | null;
  deliveryPartner?: AssignedDeliveryPartner | null;
  assignedAt?: string | Date | null;
  acceptedAt?: string | Date | null;
  pickedUpAt?: string | Date | null;
  outForDeliveryAt?: string | Date | null;
  deliveredAt?: string | Date | null;
  deliveryPin?: string | null; // Decrypted PIN returned exclusively to authenticated customer
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  verificationAudits?: DeliveryVerificationAudit[];
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN';

export interface Review {
  id: string;
  customerId: string;
  customerName?: string;
  orderId: string;
  productId?: string | null;
  product?: {
    nameEn: string;
    nameHi: string;
  } | null;
  rating: number;
  title?: string | null;
  comment: string;
  productQualityRating?: number | null;
  packagingRating?: number | null;
  deliveryRating?: number | null;
  images: string[];
  status: ReviewStatus;
  isVerifiedPurchase: boolean;
  isFeatured: boolean;
  adminReply?: string | null;
  adminRepliedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  starDistribution: Record<number, number>;
}

export interface Offer {
  id: string;
  title: string;
  description?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  startDate: string | Date;
  endDate: string | Date;
  isActive: boolean;
  minQuantity?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  products?: {
    productId: string;
    product?: Product;
  }[];
  createdAt: string | Date;
  updatedAt?: string | Date;
}

export interface StoreSettings {
  id: string;
  brandName: string;
  brandNameHindi: string;
  tagline: string;
  taglineEnglish: string;
  whatsappNumber: string;
  serviceAreaPrimary: string;
  serviceAreaCity: string;
  serviceAreaState: string;
  serviceAreaPincode: string;
  serviceAreaDescription: string;
  minOrderValue: number;
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  isStoreOpen: boolean;
  deliverySlots: {
    id: string;
    label: string;
    time: string;
    note: string;
  }[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartCalculationResult {
  subtotal: number;
  originalSubtotal: number;
  discountTotal: number;
  deliveryFee: number;
  finalTotal: number;
  itemCount: number;
  isMinOrderMet: boolean;
  minOrderShortfall: number;
  freeDeliveryThreshold: number;
  freeDeliveryShortfall: number;
  isFreeDelivery: boolean;
  canProceedToCheckout: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

