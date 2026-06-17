import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CartPage } from "./cart-page";

describe("CartPage", () => {
  it("renders mock cart page", () => {
    render(<CartPage />);

    expect(screen.getByRole("heading", { name: "Корзина" })).toBeInTheDocument();
    expect(screen.getByText(/первый cart remote/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /оформить заказ/i })).toHaveAttribute(
      "href",
      "/checkout",
    );
  });
});
