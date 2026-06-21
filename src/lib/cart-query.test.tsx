import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { notifyCartChanged } from "./cart-events";
import {
  CartQueryProvider,
  resetCartQueryClientForTests,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
  useCartQuery,
} from "./cart-query";
import { getCart, removeCartItem, updateCartItem } from "./cart-api";
import { Cart, CartItem } from "./cart-types";

vi.mock("./cart-api", () => ({
  addCartItem: vi.fn(),
  clearCart: vi.fn(),
  getCart: vi.fn(),
  getCartSummary: vi.fn(),
  removeCartItem: vi.fn(),
  updateCartItem: vi.fn(),
}));

vi.mock("./cart-events", () => ({
  notifyCartChanged: vi.fn(),
  subscribeAuthChanged: vi.fn(() => () => undefined),
  subscribeCartChanged: vi.fn(() => () => undefined),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function createItem(overrides: Partial<CartItem> = {}): CartItem {
  const productId = overrides.productId ?? "product-1";

  return {
    id: "item-1",
    productId,
    product: {
      brand: "Demo",
      id: productId,
      imageUrl: null,
      name: "Demo Phone",
      oldPriceCents: null,
      priceCents: 1_000,
      slug: "demo-phone",
      stock: 5,
    },
    quantity: 2,
    totalCents: 2_000,
    unitPriceCents: 1_000,
    ...overrides,
  };
}

function summarizeCart(items: CartItem[]): Cart {
  const subtotalCents = items.reduce((total, item) => total + item.totalCents, 0);
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);

  return {
    id: "cart-1",
    isAnonymous: true,
    items,
    summary: {
      itemsCount: items.length,
      subtotalCents,
      totalCents: subtotalCents,
      totalQuantity,
    },
  };
}

function UpdateQuantityHarness() {
  const cartQuery = useCartQuery();
  const updateMutation = useUpdateCartItemMutation();
  const item = cartQuery.data?.items[0];

  if (!item) {
    return <p>loading</p>;
  }

  return (
    <div>
      <span data-testid="quantity">{item.quantity}</span>
      <span data-testid="subtotal">{cartQuery.data?.summary.subtotalCents}</span>
      <button
        type="button"
        onClick={() => {
          updateMutation.mutate({ itemId: item.id, quantity: 10 });
        }}
      >
        update quantity
      </button>
    </div>
  );
}

function RemoveItemHarness() {
  const cartQuery = useCartQuery();
  const removeMutation = useRemoveCartItemMutation();

  if (!cartQuery.data) {
    return <p>loading</p>;
  }

  return (
    <div>
      <span data-testid="quantity">{cartQuery.data.summary.totalQuantity}</span>
      {cartQuery.data.items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            removeMutation.mutate(item.id);
          }}
        >
          remove {item.product.name}
        </button>
      ))}
    </div>
  );
}

function renderWithCartQuery(children: React.ReactNode) {
  return render(<CartQueryProvider>{children}</CartQueryProvider>);
}

afterEach(() => {
  cleanup();
  resetCartQueryClientForTests();
  vi.clearAllMocks();
});

describe("cart query mutations", () => {
  it("optimistically clamps quantity and rolls back when update fails", async () => {
    const user = userEvent.setup();
    const initialCart = summarizeCart([createItem()]);
    const deferred = createDeferred<Cart>();

    vi.mocked(getCart).mockResolvedValue(initialCart);
    vi.mocked(updateCartItem).mockReturnValue(deferred.promise);

    renderWithCartQuery(<UpdateQuantityHarness />);

    expect(await screen.findByTestId("quantity")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "update quantity" }));

    await waitFor(() => {
      expect(screen.getByTestId("quantity")).toHaveTextContent("5");
      expect(screen.getByTestId("subtotal")).toHaveTextContent("5000");
    });

    deferred.reject(new Error("Update failed"));

    await waitFor(() => {
      expect(screen.getByTestId("quantity")).toHaveTextContent("2");
      expect(screen.getByTestId("subtotal")).toHaveTextContent("2000");
    });
    expect(notifyCartChanged).not.toHaveBeenCalled();
  });

  it("optimistically removes an item and notifies consumers after success", async () => {
    const user = userEvent.setup();
    const firstItem = createItem();
    const secondItem = createItem({
      id: "item-2",
      product: {
        brand: "Demo",
        id: "product-2",
        imageUrl: null,
        name: "Demo Book",
        oldPriceCents: null,
        priceCents: 500,
        slug: "demo-book",
        stock: 3,
      },
      productId: "product-2",
      quantity: 1,
      totalCents: 500,
      unitPriceCents: 500,
    });
    const initialCart = summarizeCart([firstItem, secondItem]);
    const serverCart = summarizeCart([secondItem]);
    const deferred = createDeferred<Cart>();

    vi.mocked(getCart).mockResolvedValue(initialCart);
    vi.mocked(removeCartItem).mockReturnValue(deferred.promise);

    renderWithCartQuery(<RemoveItemHarness />);

    expect(await screen.findByRole("button", { name: "remove Demo Phone" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "remove Demo Phone" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "remove Demo Phone" })).not.toBeInTheDocument();
      expect(screen.getByTestId("quantity")).toHaveTextContent("1");
    });

    deferred.resolve(serverCart);

    await waitFor(() => {
      expect(notifyCartChanged).toHaveBeenCalledTimes(1);
    });
  });
});
