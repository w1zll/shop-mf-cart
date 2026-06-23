export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  brand: string;
  priceCents: number;
  oldPriceCents: number | null;
  stock: number;
  imageUrl: string | null;
}

export interface CartItem {
  id: string;
  productId: string;
  product: CartProduct;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface CartSummary {
  itemsCount: number;
  totalQuantity: number;
  subtotalCents: number;
  totalCents: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
}

export interface Cart {
  id: string;
  isAnonymous: boolean;
  items: CartItem[];
  summary: CartSummary;
}

export type CartLoadState = "idle" | "loading" | "success" | "error";

export type DeliveryMethod = "PICKUP" | "COURIER";

export interface CreateOrderPayload {
  apartment?: string;
  bonusToSpend?: number;
  city: string;
  deliveryMethod: DeliveryMethod;
  house: string;
  name: string;
  phone: string;
  postalCode: string;
  street: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
}

export interface Order {
  id: string;
  number: string;
  status: "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED";
  paymentStatus: "PENDING" | "SUCCEEDED" | "FAILED";
  subtotalCents: number;
  discountCents: number;
  bonusSpentCents: number;
  deliveryCents: number;
  totalCents: number;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: unknown;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export const emptyCart: Cart = {
  id: "empty",
  isAnonymous: true,
  items: [],
  summary: {
    itemsCount: 0,
    totalQuantity: 0,
    subtotalCents: 0,
    totalCents: 0,
  },
};
