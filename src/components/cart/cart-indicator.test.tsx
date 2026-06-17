import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CartIndicator } from "./cart-indicator";

describe("CartIndicator", () => {
  it("renders mock cart count and total", () => {
    render(<CartIndicator />);

    expect(screen.getByRole("link", { name: /корзина, товаров: 1/i })).toHaveAttribute(
      "href",
      "/cart",
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
