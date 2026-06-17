import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetCartQueryClientForTests } from "../../lib/cart-query";
import { CartPage } from "./cart-page";

function createResponse(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    ok: true,
    status: 200,
  } as Response;
}

afterEach(() => {
  cleanup();
  resetCartQueryClientForTests();
  vi.unstubAllGlobals();
});

describe("CartPage", () => {
  it("renders cart page from API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createResponse({
          id: "cart-1",
          isAnonymous: true,
          items: [
            {
              id: "item-1",
              productId: "product-1",
              quantity: 2,
              unitPriceCents: 100000,
              totalCents: 200000,
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
            totalQuantity: 2,
            subtotalCents: 200000,
          },
        }),
      ),
    );

    render(<CartPage />);

    expect(await screen.findByRole("heading", { name: "Корзина" })).toBeInTheDocument();
    expect(screen.getByText(/синхронизируется через Cart API/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /оформить заказ/i })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });
});
