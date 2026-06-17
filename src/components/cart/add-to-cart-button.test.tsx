import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetCartQueryClientForTests } from "../../lib/cart-query";
import { AddToCartButton } from "./add-to-cart-button";

const emptyCart = {
  id: "cart-1",
  isAnonymous: true,
  items: [],
  summary: {
    itemsCount: 0,
    totalQuantity: 0,
    subtotalCents: 0,
  },
};

function createResponse(body: unknown, ok = true) {
  return {
    json: () => Promise.resolve(body),
    ok,
    status: ok ? 200 : 500,
  } as Response;
}

afterEach(() => {
  cleanup();
  resetCartQueryClientForTests();
  vi.unstubAllGlobals();
});

describe("AddToCartButton", () => {
  it("adds item through Cart API with CSRF token", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createResponse(emptyCart))
      .mockResolvedValueOnce(createResponse({ csrfToken: "csrf-token" }))
      .mockResolvedValueOnce(
        createResponse({
          ...emptyCart,
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
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    render(<AddToCartButton productId="product-1" />);

    const button = screen.getByRole("button", { name: /добавить в корзину/i });
    await user.click(button);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/cart/items",
        expect.objectContaining({
          body: JSON.stringify({ productId: "product-1", quantity: 1 }),
          credentials: "include",
          method: "POST",
        }),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/csrf",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("respects disabled state", () => {
    render(<AddToCartButton disabled productId="product-1" />);

    expect(screen.getByRole("button", { name: /добавить в корзину/i })).toBeDisabled();
  });
});
