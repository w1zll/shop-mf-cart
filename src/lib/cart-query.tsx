import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ReactNode, useEffect, useMemo } from "react";

import {
  addCartItem,
  clearCart,
  getCart,
  getCartSummary,
  removeCartItem,
  updateCartItem,
} from "./cart-api";
import { notifyCartChanged, subscribeAuthChanged, subscribeCartChanged } from "./cart-events";
import { Cart, CartSummary, emptyCart } from "./cart-types";

export const cartQueryKeys = {
  cart: ["cart"] as const,
  cartSummary: ["cartSummary"] as const,
};

let sharedQueryClient: QueryClient | null = null;

function getSharedQueryClient() {
  sharedQueryClient ??= new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 15_000,
      },
    },
  });

  return sharedQueryClient;
}

export function resetCartQueryClientForTests() {
  sharedQueryClient?.clear();
}

export function CartQueryProvider({ children }: Readonly<{ children: ReactNode }>) {
  const queryClient = useMemo(() => getSharedQueryClient(), []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function updateCartCaches(queryClient: QueryClient, cart: Cart) {
  queryClient.setQueryData(cartQueryKeys.cart, cart);
  queryClient.setQueryData(cartQueryKeys.cartSummary, cart.summary);
}

function invalidateCartQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: cartQueryKeys.cart });
  void queryClient.invalidateQueries({ queryKey: cartQueryKeys.cartSummary });
}

export function useCartQuery() {
  return useQuery({
    queryFn: getCart,
    queryKey: cartQueryKeys.cart,
  });
}

export function useCartSummaryQuery() {
  return useQuery({
    queryFn: getCartSummary,
    queryKey: cartQueryKeys.cartSummary,
  });
}

export function useCartInvalidationSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribeCartChanged = subscribeCartChanged(() => {
      invalidateCartQueries(queryClient);
    });
    const unsubscribeAuthChanged = subscribeAuthChanged((isAuthenticated) => {
      if (!isAuthenticated) {
        updateCartCaches(queryClient, emptyCart);
      }

      invalidateCartQueries(queryClient);
    });

    return () => {
      unsubscribeCartChanged();
      unsubscribeAuthChanged();
    };
  }, [queryClient]);
}

export function useAddCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity = 1 }: { productId: string; quantity?: number }) =>
      addCartItem(productId, quantity),
    onMutate: async ({ productId, quantity = 1 }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart });
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart);

      if (previousCart) {
        const nextCart = {
          ...previousCart,
          items: previousCart.items.map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + quantity, item.product.stock),
                  totalCents:
                    Math.min(item.quantity + quantity, item.product.stock) * item.unitPriceCents,
                }
              : item,
          ),
        };
        updateCartCaches(queryClient, summarizeCart(nextCart));
      }

      return { previousCart };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        updateCartCaches(queryClient, context.previousCart);
      }
    },
    onSuccess: (cart) => {
      updateCartCaches(queryClient, cart);
      notifyCartChanged();
    },
  });
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      updateCartItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart });
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart);

      if (previousCart) {
        const nextCart = {
          ...previousCart,
          items: previousCart.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: Math.min(Math.max(quantity, 1), item.product.stock),
                  totalCents:
                    Math.min(Math.max(quantity, 1), item.product.stock) * item.unitPriceCents,
                }
              : item,
          ),
        };
        updateCartCaches(queryClient, summarizeCart(nextCart));
      }

      return { previousCart };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        updateCartCaches(queryClient, context.previousCart);
      }
    },
    onSuccess: (cart) => {
      updateCartCaches(queryClient, cart);
      notifyCartChanged();
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeCartItem,
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart });
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart);

      if (previousCart) {
        updateCartCaches(
          queryClient,
          summarizeCart({
            ...previousCart,
            items: previousCart.items.filter((item) => item.id !== itemId),
          }),
        );
      }

      return { previousCart };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        updateCartCaches(queryClient, context.previousCart);
      }
    },
    onSuccess: (cart) => {
      updateCartCaches(queryClient, cart);
      notifyCartChanged();
    },
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCart,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartQueryKeys.cart });
      const previousCart = queryClient.getQueryData<Cart>(cartQueryKeys.cart);

      updateCartCaches(queryClient, {
        ...emptyCart,
        id: previousCart?.id ?? emptyCart.id,
        isAnonymous: previousCart?.isAnonymous ?? true,
      });

      return { previousCart };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousCart) {
        updateCartCaches(queryClient, context.previousCart);
      }
    },
    onSuccess: (cart) => {
      updateCartCaches(queryClient, cart);
      notifyCartChanged();
    },
  });
}

function summarizeCart(cart: Cart): Cart {
  const summary: CartSummary = {
    itemsCount: cart.items.length,
    totalQuantity: cart.items.reduce((total, item) => total + item.quantity, 0),
    subtotalCents: cart.items.reduce((total, item) => total + item.totalCents, 0),
    totalCents: cart.items.reduce((total, item) => total + item.totalCents, 0),
  };

  return {
    ...cart,
    summary,
  };
}
