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

export interface Cart {
  id: string;
  isAnonymous: boolean;
  items: CartItem[];
  summary: CartSummary;
}

export type CartLoadState = "idle" | "loading" | "success" | "error";

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
