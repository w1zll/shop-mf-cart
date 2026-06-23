import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetCartQueryClientForTests } from "../../lib/cart-query";
import { CheckoutPage } from "./checkout-page";

function createResponse(body: unknown, status = 200) {
  return {
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function getRequestUrl(input: RequestInfo | URL) {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
}

const cartResponse = {
  id: "cart-1",
  isAnonymous: false,
  items: [
    {
      id: "item-1",
      productId: "product-1",
      quantity: 1,
      unitPriceCents: 100000,
      totalCents: 100000,
      product: {
        id: "product-1",
        name: "Demo Phone",
        slug: "demo-phone",
        brand: "Demo",
        priceCents: 100000,
        oldPriceCents: null,
        stock: 5,
        imageUrl: null,
      },
    },
  ],
  summary: {
    itemsCount: 1,
    totalQuantity: 1,
    subtotalCents: 100000,
  },
};

const orderResponse = {
  id: "order-1",
  number: "ORD-1",
  status: "PENDING_PAYMENT",
  paymentStatus: "PENDING",
  subtotalCents: 100000,
  discountCents: 0,
  bonusSpentCents: 0,
  deliveryCents: 0,
  totalCents: 100000,
  deliveryMethod: "PICKUP",
  deliveryAddress: {},
  items: [],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const authResponse = {
  user: {
    id: "user-1",
    email: "demo@example.com",
    name: "Demo User",
  },
};

afterEach(() => {
  cleanup();
  resetCartQueryClientForTests();
  vi.unstubAllGlobals();
});

describe("CheckoutPage", () => {
  it("keeps checkout on contacts step when required contact fields are empty", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url.endsWith("/cart")) {
        return Promise.resolve(createResponse(cartResponse));
      }

      if (url.endsWith("/users/me")) {
        return Promise.resolve(createResponse(authResponse));
      }

      return Promise.resolve(createResponse({ message: "Unexpected request" }, 500));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPage />);

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: "Оформление заказа" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Далее" }));

    expect(await screen.findByText("Укажите имя")).toBeInTheDocument();
    expect(screen.getByText("Укажите телефон")).toBeInTheDocument();
    expect(screen.queryByLabelText("Город")).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) => {
        const url = getRequestUrl(input);

        return url.endsWith("/orders");
      }),
    ).toBe(false);
  });

  it("creates order from checkout form and opens mock payment step", async () => {
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = getRequestUrl(input);

      if (url.endsWith("/cart")) {
        return Promise.resolve(createResponse(cartResponse));
      }

      if (url.endsWith("/users/me")) {
        return Promise.resolve(createResponse(authResponse));
      }

      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createResponse({ csrfToken: "csrf-token" }));
      }

      if (url.endsWith("/orders") && init?.method === "POST") {
        return Promise.resolve(createResponse(orderResponse, 201));
      }

      return Promise.resolve(createResponse({ message: "Unexpected request" }, 500));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPage />);

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: "Оформление заказа" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("Имя"), "Demo User");
    await user.type(screen.getByLabelText("Телефон"), "+79990000000");
    await user.click(screen.getByRole("button", { name: "Далее" }));

    await user.type(await screen.findByLabelText("Город"), "Moscow");
    await user.type(screen.getByLabelText("Улица"), "Tverskaya");
    await user.type(screen.getByLabelText("Дом"), "1");
    await user.type(screen.getByLabelText("Индекс"), "101000");
    await user.selectOptions(screen.getByLabelText("Способ доставки"), "PICKUP");
    await user.click(screen.getByRole("button", { name: "Далее" }));

    await user.clear(await screen.findByLabelText("Бонусы к списанию"));
    await user.type(screen.getByLabelText("Бонусы к списанию"), "0");
    await user.click(screen.getByRole("button", { name: "Создать заказ" }));

    expect(await screen.findByRole("button", { name: "Оплатить mock payment" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/orders",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("asks anonymous users to sign in before checkout", async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url.endsWith("/cart")) {
        return Promise.resolve(createResponse(cartResponse));
      }

      if (url.endsWith("/users/me")) {
        return Promise.resolve(createResponse({ message: "Unauthorized" }, 401));
      }

      if (url.endsWith("/auth/csrf")) {
        return Promise.resolve(createResponse({ csrfToken: "csrf-token" }));
      }

      if (url.endsWith("/auth/refresh")) {
        return Promise.resolve(createResponse({ message: "Unauthorized" }, 401));
      }

      return Promise.resolve(createResponse({ message: "Unexpected request" }, 500));
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CheckoutPage />);

    expect(await screen.findByRole("heading", { name: "Нужно войти" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Войти" })).toHaveAttribute("href", "/login");
    expect(
      fetchMock.mock.calls.some(([input]) => getRequestUrl(input).endsWith("/orders")),
    ).toBe(false);
  });
});
