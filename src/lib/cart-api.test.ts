import { afterEach, describe, expect, it, vi } from "vitest";

import { Cart, CartSummary, CreateOrderPayload, Order } from "./cart-types";

function createFetchMock() {
  return vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
}

function createResponse(body: unknown, status = 200) {
  return {
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function createCartResponse(subtotalCents = 125_000): Cart {
  return {
    id: "cart-1",
    isAnonymous: true,
    items: [],
    summary: {
      itemsCount: 0,
      subtotalCents,
      totalCents: 999_999,
      totalQuantity: 0,
    },
  };
}

function createOrderResponse(): Order {
  return {
    bonusSpentCents: 0,
    earnedBonusCents: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    deliveryAddress: {},
    deliveryCents: 0,
    deliveryMethod: "PICKUP",
    discountCents: 0,
    id: "order-1",
    items: [],
    number: "ORD-1",
    paymentStatus: "PENDING",
    status: "PENDING_PAYMENT",
    subtotalCents: 125_000,
    totalCents: 125_000,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function getRequestUrl(input: RequestInfo | URL) {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

function getHeader(init: RequestInit | undefined, name: string) {
  return new Headers(init?.headers).get(name);
}

function getFetchCall(fetchMock: ReturnType<typeof createFetchMock>, index: number) {
  const call = fetchMock.mock.calls[index];

  if (!call) {
    throw new Error(`Expected fetch call at index ${String(index)}`);
  }

  return call;
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("cart API client", () => {
  it("normalizes cart totals from subtotal values", async () => {
    const fetchMock = createFetchMock();
    fetchMock
      .mockResolvedValueOnce(createResponse(createCartResponse(125_000)))
      .mockResolvedValueOnce(
        createResponse({
          itemsCount: 1,
          subtotalCents: 250_000,
          totalCents: 999_999,
          totalQuantity: 3,
        } satisfies CartSummary),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { getCart, getCartSummary } = await import("./cart-api");

    await expect(getCart()).resolves.toMatchObject({
      summary: {
        subtotalCents: 125_000,
        totalCents: 125_000,
      },
    });
    await expect(getCartSummary()).resolves.toMatchObject({
      subtotalCents: 250_000,
      totalCents: 250_000,
    });
  });

  it("adds CSRF and JSON headers for unsafe requests", async () => {
    const payload: CreateOrderPayload = {
      bonusToSpend: 0,
      city: "Moscow",
      deliveryMethod: "PICKUP",
      house: "1",
      name: "Demo User",
      phone: "+79990000000",
      postalCode: "101000",
      street: "Tverskaya",
    };
    const fetchMock = createFetchMock();
    fetchMock
      .mockResolvedValueOnce(createResponse({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(createResponse(createOrderResponse(), 201));
    vi.stubGlobal("fetch", fetchMock);

    const { createOrder } = await import("./cart-api");

    await createOrder(payload);

    const csrfCall = getFetchCall(fetchMock, 0);
    const orderCall = getFetchCall(fetchMock, 1);
    const [, orderInit] = orderCall;

    expect(getRequestUrl(csrfCall[0])).toBe("/api/v1/auth/csrf");
    expect(csrfCall[1]).toEqual(expect.objectContaining({ credentials: "include" }));
    expect(getRequestUrl(orderCall[0])).toBe("/api/v1/orders");
    expect(orderInit).toEqual(expect.objectContaining({ credentials: "include", method: "POST" }));
    expect(getHeader(orderInit, "Content-Type")).toBe("application/json");
    expect(getHeader(orderInit, "X-CSRF-Token")).toBe("csrf-token");
  });

  it("refreshes access token once and retries unauthorized cart requests", async () => {
    const fetchMock = createFetchMock();
    fetchMock
      .mockResolvedValueOnce(createResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(createResponse({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(createResponse({ ok: true }))
      .mockResolvedValueOnce(createResponse(createCartResponse(300_000)));
    vi.stubGlobal("fetch", fetchMock);

    const { getCart } = await import("./cart-api");

    await expect(getCart()).resolves.toMatchObject({
      summary: {
        totalCents: 300_000,
      },
    });

    const requestedUrls = fetchMock.mock.calls.map(([input]) => getRequestUrl(input));
    const [, refreshInit] = getFetchCall(fetchMock, 2);

    expect(requestedUrls).toEqual([
      "/api/v1/cart",
      "/api/v1/auth/csrf",
      "/api/v1/auth/refresh",
      "/api/v1/cart",
    ]);
    expect(refreshInit).toEqual(
      expect.objectContaining({ credentials: "include", method: "POST" }),
    );
    expect(getHeader(refreshInit, "X-CSRF-Token")).toBe("csrf-token");
  });

  it("returns null for an anonymous current user", async () => {
    const fetchMock = createFetchMock();
    fetchMock
      .mockResolvedValueOnce(createResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(createResponse({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(createResponse({ message: "Unauthorized" }, 401));
    vi.stubGlobal("fetch", fetchMock);

    const { getCurrentUser } = await import("./cart-api");

    await expect(getCurrentUser()).resolves.toBeNull();

    expect(fetchMock.mock.calls.map(([input]) => getRequestUrl(input))).toEqual([
      "/api/v1/users/me",
      "/api/v1/auth/csrf",
      "/api/v1/auth/refresh",
    ]);
  });
});
