import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import {
  addMockCartItem,
  clearMockCart,
  getMockCart,
  removeMockCartItem,
  updateMockCartItemQuantity,
} from "./mock-cart-repository";
import { Cart, CartLoadState } from "./cart-types";

interface CartStoreValue {
  cart: Cart;
  state: CartLoadState;
  addItem: (productId: string) => void;
  clearCart: () => void;
  removeItem: (itemId: string) => void;
  setError: () => void;
  setLoading: () => void;
  updateQuantity: (itemId: string, quantity: number) => void;
}

const CartStoreContext = createContext<CartStoreValue | null>(null);

export function CartStoreProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [cart, setCart] = useState<Cart>(() => getMockCart());
  const [state, setState] = useState<CartLoadState>("success");

  const value = useMemo<CartStoreValue>(
    () => ({
      cart,
      state,
      addItem(productId) {
        setState("success");
        setCart(addMockCartItem(productId));
      },
      clearCart() {
        setState("success");
        setCart(clearMockCart());
      },
      removeItem(itemId) {
        setState("success");
        setCart(removeMockCartItem(itemId));
      },
      setError() {
        setState("error");
      },
      setLoading() {
        setState("loading");
      },
      updateQuantity(itemId, quantity) {
        setState("success");
        setCart(updateMockCartItemQuantity(itemId, quantity));
      },
    }),
    [cart, state],
  );

  return <CartStoreContext.Provider value={value}>{children}</CartStoreContext.Provider>;
}

export function useCartStore() {
  const value = useContext(CartStoreContext);

  if (!value) {
    throw new Error("useCartStore must be used inside CartStoreProvider");
  }

  return value;
}
