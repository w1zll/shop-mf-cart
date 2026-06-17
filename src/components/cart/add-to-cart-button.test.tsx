import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AddToCartButton } from "./add-to-cart-button";

describe("AddToCartButton", () => {
  it("renders add action", async () => {
    const user = userEvent.setup();

    render(<AddToCartButton />);

    const button = screen.getByRole("button", { name: /добавить в корзину/i });
    await user.click(button);

    expect(button).toBeEnabled();
  });
});
