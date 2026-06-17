import { Cart, CartItem, CartProduct } from "./cart-types";

const mockProducts: CartProduct[] = [
  {
    id: "prod_airbeat_lite",
    name: "Беспроводные наушники AirBeat Lite",
    slug: "airbeat-lite-headphones",
    priceCents: 649000,
    stock: 12,
  },
  {
    id: "prod_runner",
    name: "Кроссовки Move Runner",
    slug: "move-runner-sneakers",
    priceCents: 749000,
    stock: 7,
  },
];

const initialItems: CartItem[] = [
  {
    id: "cart_item_airbeat",
    product: mockProducts[0] ?? {
      id: "prod_fallback",
      name: "Тестовый товар",
      slug: "fallback-product",
      priceCents: 0,
      stock: 1,
    },
    quantity: 1,
  },
];

function summarize(items: CartItem[]) {
  return {
    itemsCount: items.reduce((total, item) => total + item.quantity, 0),
    totalCents: items.reduce((total, item) => total + item.product.priceCents * item.quantity, 0),
  };
}

function createCart(items: CartItem[]): Cart {
  return {
    id: "mock_cart",
    items,
    summary: summarize(items),
  };
}

let cart = createCart(initialItems);

export function getMockProducts(): CartProduct[] {
  return mockProducts;
}

export function getMockCart(): Cart {
  return cart;
}

export function addMockCartItem(productId: string): Cart {
  const product = mockProducts.find((item) => item.id === productId);

  if (!product) {
    return cart;
  }

  const currentItem = cart.items.find((item) => item.product.id === productId);

  if (currentItem) {
    const nextItems = cart.items.map((item) =>
      item.id === currentItem.id
        ? { ...item, quantity: Math.min(item.quantity + 1, item.product.stock) }
        : item,
    );
    cart = createCart(nextItems);
    return cart;
  }

  cart = createCart([
    ...cart.items,
    {
      id: `cart_item_${product.id}`,
      product,
      quantity: 1,
    },
  ]);

  return cart;
}

export function updateMockCartItemQuantity(itemId: string, quantity: number): Cart {
  const nextItems = cart.items
    .map((item) =>
      item.id === itemId
        ? { ...item, quantity: Math.min(Math.max(quantity, 1), item.product.stock) }
        : item,
    )
    .filter((item) => item.quantity > 0);

  cart = createCart(nextItems);
  return cart;
}

export function removeMockCartItem(itemId: string): Cart {
  cart = createCart(cart.items.filter((item) => item.id !== itemId));
  return cart;
}

export function clearMockCart(): Cart {
  cart = createCart([]);
  return cart;
}

export function resetMockCart(): Cart {
  cart = createCart(initialItems);
  return cart;
}
