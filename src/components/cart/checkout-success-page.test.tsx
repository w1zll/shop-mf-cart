import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CheckoutSuccessPage } from "./checkout-success-page";

function createResponse(body: unknown) {
  return {
    json: () => Promise.resolve(body),
    ok: true,
    status: 200,
  } as Response;
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
});

describe("CheckoutSuccessPage", () => {
  it("shows bonuses earned for the paid order", async () => {
    window.history.replaceState(null, "", "/checkout/successful?orderId=order-1");
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          createResponse({
            bonusSpentCents: 0,
            createdAt: "2026-01-01T00:00:00.000Z",
            deliveryAddress: {},
            deliveryCents: 0,
            deliveryMethod: "PICKUP",
            discountCents: 0,
            earnedBonusCents: 9_500,
            id: "order-1",
            items: [],
            number: "ORD-1",
            paymentStatus: "SUCCEEDED",
            status: "PAID",
            subtotalCents: 190_000,
            totalCents: 190_000,
            updatedAt: "2026-01-01T00:00:00.000Z",
          }),
        ),
      ),
    );

    render(<CheckoutSuccessPage />);

    expect(await screen.findByText(/За этот заказ начислено/)).toHaveTextContent("9500");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/orders/order-1",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
