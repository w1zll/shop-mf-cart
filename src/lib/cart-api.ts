import { Cart, CartSummary } from "./cart-types";

const API_BASE_URL = "/api/v1";
const unsafeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

let csrfToken: string | null = null;

async function ensureCsrfToken() {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}/auth/csrf`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Не удалось получить CSRF-токен");
  }

  const body = (await response.json()) as { csrfToken?: string };

  if (!body.csrfToken) {
    throw new Error("API вернул пустой CSRF-токен");
  }

  csrfToken = body.csrfToken;
  return csrfToken;
}

async function requestApi<TResponse>(path: string, init: RequestInit = {}) {
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (unsafeMethods.has(method.toUpperCase())) {
    headers.set("X-CSRF-Token", await ensureCsrfToken());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
    method,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? `Cart API вернул HTTP ${String(response.status)}`);
  }

  return (await response.json()) as TResponse;
}

function normalizeCart(cart: Cart): Cart {
  return {
    ...cart,
    summary: {
      ...cart.summary,
      totalCents: cart.summary.subtotalCents,
    },
  };
}

export function getCart() {
  return requestApi<Cart>("/cart").then(normalizeCart);
}

export function getCartSummary() {
  return requestApi<CartSummary>("/cart/summary").then((summary) => ({
    ...summary,
    totalCents: summary.subtotalCents,
  }));
}

export function addCartItem(productId: string, quantity = 1) {
  return requestApi<Cart>("/cart/items", {
    body: JSON.stringify({ productId, quantity }),
    method: "POST",
  }).then(normalizeCart);
}

export function updateCartItem(itemId: string, quantity: number) {
  return requestApi<Cart>(`/cart/items/${itemId}`, {
    body: JSON.stringify({ quantity }),
    method: "PATCH",
  }).then(normalizeCart);
}

export function removeCartItem(itemId: string) {
  return requestApi<Cart>(`/cart/items/${itemId}`, {
    method: "DELETE",
  }).then(normalizeCart);
}

export function clearCart() {
  return requestApi<Cart>("/cart", {
    method: "DELETE",
  }).then(normalizeCart);
}
