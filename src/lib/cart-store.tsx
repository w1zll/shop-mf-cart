import { createContext, ReactNode, useContext, useMemo } from "react";

import {
  CartQueryProvider,
  useAddCartItemMutation,
  useCartInvalidationSubscription,
  useCartQuery,
  useClearCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "./cart-query";
import { Cart, CartLoadState, emptyCart } from "./cart-types";

interface CartStoreValue {
  cart: Cart;
  state: CartLoadState;
  addItem: (productId: string, quantity?: number) => void;
  clearCart: () => void;
  removeItem: (itemId: string) => void;
  setError: () => void;
  setLoading: () => void;
  updateQuantity: (itemId: string, quantity: number) => void;
}

const CartStoreContext = createContext<CartStoreValue | null>(null);

function CartStoreProviderContent({ children }: Readonly<{ children: ReactNode }>) {
  useCartInvalidationSubscription();

  const cartQuery = useCartQuery();
  const addItemMutation = useAddCartItemMutation();
  const clearCartMutation = useClearCartMutation();
  const removeItemMutation = useRemoveCartItemMutation();
  const updateItemMutation = useUpdateCartItemMutation();
  const isMutating =
    addItemMutation.isPending ||
    clearCartMutation.isPending ||
    removeItemMutation.isPending ||
    updateItemMutation.isPending;
  const cart = cartQuery.data ?? emptyCart;
  const state: CartLoadState = cartQuery.isLoading
    ? "loading"
    : cartQuery.isError
      ? "error"
      : "success";

  const value = useMemo<CartStoreValue>(
    () => ({
      cart,
      state: isMutating && cartQuery.data ? "success" : state,
      addItem(productId, quantity = 1) {
        addItemMutation.mutate({ productId, quantity });
      },
      clearCart() {
        clearCartMutation.mutate();
      },
      removeItem(itemId) {
        removeItemMutation.mutate(itemId);
      },
      setError() {
        // Сохранено для старых тестовых сценариев, реальные ошибки приходят из query state.
      },
      setLoading() {
        void cartQuery.refetch();
      },
      updateQuantity(itemId, quantity) {
        updateItemMutation.mutate({ itemId, quantity });
      },
    }),
    [
      addItemMutation,
      cart,
      cartQuery,
      clearCartMutation,
      isMutating,
      removeItemMutation,
      state,
      updateItemMutation,
    ],
  );

  return <CartStoreContext.Provider value={value}>{children}</CartStoreContext.Provider>;
}

export function CartStoreProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <CartQueryProvider>
      <CartStoreProviderContent>{children}</CartStoreProviderContent>
    </CartQueryProvider>
  );
}

export function useCartStore() {
  const value = useContext(CartStoreContext);

  if (!value) {
    throw new Error("useCartStore must be used inside CartStoreProvider");
  }

  return value;
}
