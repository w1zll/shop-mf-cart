import { AuthResponse, Cart, CartSummary, CreateOrderPayload, Order } from "./cart-types";

const API_BASE_URL = "/api/v1";
const unsafeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

let csrfToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

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

async function refreshAccessToken() {
  refreshPromise ??= (async () => {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      credentials: "include",
      headers: {
        "X-CSRF-Token": await ensureCsrfToken(),
      },
      method: "POST",
    });

    if (!response.ok) {
      throw new ApiError("Не удалось обновить сессию", response.status);
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

async function sendApiRequest(path: string, init: RequestInit) {
  const method = init.method ?? "GET";
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (unsafeMethods.has(method.toUpperCase())) {
    headers.set("X-CSRF-Token", await ensureCsrfToken());
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
    method,
  });
}

async function readApiError(response: Response) {
  const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
  return new ApiError(
    errorBody?.message ?? `Cart API вернул HTTP ${String(response.status)}`,
    response.status,
  );
}

async function requestApi<TResponse>(
  path: string,
  init: RequestInit = {},
  retryOnUnauthorized = true,
) {
  const response = await sendApiRequest(path, init);

  if (response.status === 401 && retryOnUnauthorized && !path.startsWith("/auth/")) {
    try {
      await refreshAccessToken();
      return await requestApi<TResponse>(path, init, false);
    } catch {
      throw await readApiError(response);
    }
  }

  if (!response.ok) {
    throw await readApiError(response);
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

export async function getCurrentUser() {
  try {
    return await requestApi<AuthResponse>("/users/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
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

export function createOrder(payload: CreateOrderPayload) {
  return requestApi<Order>("/orders", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function payOrderMock(orderId: string, idempotencyKey: string) {
  return requestApi<Order>(`/orders/${orderId}/pay/mock`, {
    body: JSON.stringify({ idempotencyKey }),
    method: "POST",
  });
}
