export interface CartProduct {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  stock: number;
}

export interface CartItem {
  id: string;
  product: CartProduct;
  quantity: number;
}

export interface CartSummary {
  itemsCount: number;
  totalCents: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  summary: CartSummary;
}

export type CartLoadState = "idle" | "loading" | "success" | "error";
