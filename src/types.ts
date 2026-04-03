
export enum OrderStatus {
  PENDING = 'جديد',
  CONFIRMED = 'مؤكد',
  PROCESSING = 'قيد التجهيز',
  SHIPPED = 'قيد التوصيل',
  DELIVERED = 'تم التسليم',
  CANCELLED = 'ملغي'
}

export enum PaymentStatus {
  PENDING = 'Pending',
  UNPAID = 'Unpaid',
  PAID = 'Paid',
  FAILED = 'Failed',
  REFUNDED = 'Refunded'
}

export interface Spec {
  key: string;
  value: string;
}

export interface Product {
  id: string;
  storeId: string;
  name_ar: string;
  name_en?: string;
  price: number;
  costPrice?: number;
  salePrice?: number;
  discountExpiry?: string;
  categoryId: string;
  brandId?: string;
  brand?: string;
  sku?: string;
  stockQuantity: number;
  isActive: boolean;
  images: string[];
  specs: Spec[];
  description_ar: string;
  description_en?: string;
  rating?: number;
  reviewCount?: number;
  isLandingPageOnly?: boolean;
  isDigital?: boolean;
  digitalContent?: string;
  digitalKeys?: string[];
  shippingCompanyId?: string;
  allowInstallments?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  addedAt: any;
}

export interface Category {
  id: string;
  storeId: string;
  name_ar: string;
  order: number;
  isActive: boolean;
}

export interface Brand {
  id: string;
  storeId: string;
  name: string;
  logoUrl?: string;
  isActive: boolean;
  createdAt?: any;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  image: string;
  isDigital?: boolean;
  assignedKeys?: string[];
}

export interface Order {
  id: string;
  storeId: string;
  orderNumber: string;
  userId?: string;
  customer: {
    name: string;
    phone: string;
    city: string;
    address: string;
    notes?: string;
  };
  items: CartItem[];
  subtotal?: number;
  shippingCost?: number;
  paymentFee?: number;
  shippingCompany?: string;
  totalAmount: number;
  paymentMethod: 'COD' | 'WAYL';
  status: OrderStatus;
  statusHistory?: {
    status: OrderStatus;
    timestamp: any;
    notes?: string;
    updatedBy?: string;
  }[];
  paymentStatus?: PaymentStatus;
  isSettled?: boolean;
  settledAt?: any;
  createdAt: any;
  updatedAt: any;
  source?: string;
  sessionId?: string;
  utmSource?: string;
  utmCampaign?: string;
}

export interface ProvincePrice {
  city: string;
  price: number;
}

export interface ShippingCompany {
  id: string;
  name: string;
  isActive: boolean;
  prices: ProvincePrice[];
  createdAt: string;
  excelTemplate?: Record<string, string>;
  isSystem?: boolean;
  apiConfig?: {
    type: 'heeiz' | 'none';
    baseUrl?: string;
    token?: string;
  };
  provinceMapping?: Record<string, number>;
  regionMapping?: Record<string, number>;
}

export interface User {
  uid: string;
  storeId?: string; // Optional for super_admins, required for store admins/customers
  role: 'admin' | 'customer' | 'super_admin' | 'team_member';
  name: string;
  phone?: string;
  email: string;
  address?: string;
  city?: string;
  region?: string;
  nearestPoint?: string;
  password?: string;
  permissions?: string[];
  createdAt: string;
}

export interface HeroSlide {
  id: string;
  image: string;
  mobileImage?: string;
  title: string;
  subtitle: string;
  link: string;
  isActive: boolean;
  order: number;
  hideContent?: boolean;
}

export interface Ticket {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  createdAt: any;
}

export interface Story {
  id: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  productId?: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  databaseId?: string; // Optional, defaults to (default) if not provided
  ownerId: string;
  logoUrl?: string;
  status: 'active' | 'suspended' | 'pending';
  plan: 'basic' | 'pro' | 'enterprise';
  createdAt: any;
  settings: StoreSettings;
}

export interface StoreSettings {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  logoUrl?: string;
  heroUrl?: string;
  theme?: 'default' | 'ramadan' | 'winter';
  storeStatus?: 'open' | 'closed' | 'maintenance';
  openingDate?: string;
  aboutUs_ar?: string;
  globalDiscount?: number;
  globalDiscountExpiry?: string;
  metaPixelId?: string;
  tiktokPixelId?: string;
  snapchatPixelId?: string;
  heeizApiKey?: string;
  heeizPartnerId?: string;
}

export interface Supplier {
  id: string;
  name: string;
  website?: string;
  phone?: string;
  address?: string;
  category: string;
  createdAt: string;
}

export interface LandingPageSession {
  id: string;
  productId: string;
  productName: string;
  entryTime: any;
  timestamp?: any;
  orderTime?: any;
  duration?: number;
  isConverted: boolean;
  scrollDepth: number;
  device?: 'mobile' | 'desktop' | 'tablet';
  interactions: {
    type: string;
    element: string;
    timestamp: any;
  }[];
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceInfo: {
    userAgent: string;
    platform: string;
    screenSize: string;
  };
  customerInfo?: {
    name: string;
    phone: string;
    city: string;
  };
}

// Facebook Ads Manager Types
export interface FbAdAccount {
  id: string;
  name: string;
  status: 'active' | 'disabled' | 'pending';
  currency: string;
  balance: number;
  spendCap?: number;
  createdAt: any;
}

export interface FbCampaign {
  id: string;
  accountId: string;
  name: string;
  objective: string;
  status: 'active' | 'paused' | 'archived' | 'deleted';
  budget: number;
  spend: number;
  results: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  roas: number;
  startDate: any;
  endDate?: any;
}

export interface FbAd {
  id: string;
  campaignId: string;
  accountId: string;
  name: string;
  status: 'active' | 'paused' | 'archived' | 'deleted' | 'rejected';
  creativeUrl: string;
  creativeType: 'image' | 'video' | 'carousel';
  primaryText: string;
  headline: string;
  spend: number;
  results: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  roas: number;
  createdAt: any;
}

export interface FbAdLog {
  id: string;
  adId: string;
  action: string;
  details: string;
  performedBy: string;
  timestamp: any;
}

export interface FbMessage {
  id: string;
  adId?: string;
  senderName: string;
  senderId: string;
  message: string;
  timestamp: any;
  isRead: boolean;
}
