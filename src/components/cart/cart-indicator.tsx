import { ShoppingCart } from "lucide-react";
import { Badge, Button, Price } from "@w1zll/shop-ui";

import { CartStoreProvider, useCartStore } from "../../lib/cart-store";

function CartIndicatorView() {
  const { cart } = useCartStore();

  return (
    <Button asChild className="relative gap-2" variant="outline">
      <a href="/cart" aria-label={`Корзина, товаров: ${String(cart.summary.itemsCount)}`}>
        <ShoppingCart className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline-flex">
          <Price valueCents={cart.summary.totalCents} />
        </span>
        <Badge className="absolute -right-2 -top-2 px-1.5 py-0 text-[10px]">
          {cart.summary.itemsCount}
        </Badge>
      </a>
    </Button>
  );
}

export function CartIndicator() {
  return (
    <CartStoreProvider>
      <CartIndicatorView />
    </CartStoreProvider>
  );
}

export default CartIndicator;
