import { ShoppingCart } from "lucide-react";
import { Badge, Button, Price } from "@w1zll/shop-ui";

import "../../remote-styles";
import { CartStoreProvider, useCartStore } from "../../lib/cart-store";

function CartIndicatorView() {
  const { cart } = useCartStore();

  return (
    <Button asChild className="relative gap-2" variant="outline">
      <a href="/cart" aria-label={`Корзина, товаров: ${String(cart.summary.totalQuantity)}`}>
        <ShoppingCart className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline-flex">
          <Price valueCents={cart.summary.totalCents} />
        </span>
        <Badge className="absolute -right-2 -top-2 px-1.5 py-0 text-[10px]">
          {cart.summary.totalQuantity}
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
