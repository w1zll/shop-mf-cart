import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetCartQueryClientForTests } from "../../lib/cart-query";
import { CartIndicator } from "./cart-indicator";

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

describe("CartIndicator", () => {
  it("renders cart count and total from API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createResponse({
          id: "cart-1",
          isAnonymous: true,
          items: [],
          summary: {
            itemsCount: 1,
            totalQuantity: 2,
            subtotalCents: 200000,
          },
        }),
      ),
    );

    render(<CartIndicator />);

    expect(
      await screen.findByRole("link", { name: /корзина, товаров: 2/i }),
    ).toHaveAttribute("href", "/cart");
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("200000")).toBeInTheDocument();
  });
});
