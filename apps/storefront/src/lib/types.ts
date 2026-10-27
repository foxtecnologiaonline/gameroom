export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type OfferCondition = "new" | "used";

export interface Offer {
  id: string;
  productId: string;
  sellerId: string;
  priceCents: number;
  stock: number;
  condition: OfferCondition;
  slaDays: number;
  isBuyboxWinner: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  brand: string | null;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface ProductWithOffers extends Product {
  offers: Offer[];
}

export interface CartItem {
  id: string;
  cartId: string;
  offerId: string;
  quantity: number;
  createdAt: string;
  offer: Offer;
}

export interface Cart {
  id: string;
  buyerId: string;
  createdAt: string;
  items: CartItem[];
}

export interface OrderItem {
  id: string;
  subOrderId: string;
  offerId: string;
  quantity: number;
  unitPriceCents: number;
  createdAt: string;
}

export type SubOrderStatus = "pending" | "paid" | "shipped" | "delivered";

export interface SubOrder {
  id: string;
  orderId: string;
  sellerId: string;
  subtotalCents: number;
  shippingCents: number;
  status: SubOrderStatus;
  createdAt: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  buyerId: string;
  totalCents: number;
  status: string;
  createdAt: string;
  subOrders: SubOrder[];
}

export type PaymentMethod = "credit_card" | "pix";
export type PaymentStatus = "pending" | "paid" | "failed";

export interface Payment {
  id: string;
  orderId: string;
  gatewayId: string;
  status: PaymentStatus;
  method: PaymentMethod;
  totalCents: number;
  createdAt: string;
}

export interface SellerPublic {
  id: string;
  storeName: string;
}

export interface Review {
  id: string;
  subOrderId: string;
  buyerId: string;
  sellerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
}
