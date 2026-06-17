import { ShoppingCart } from "lucide-react";
import { Button } from "@w1zll/shop-ui";

import { CartStoreProvider, useCartStore } from "../../lib/cart-store";
import { getMockProducts } from "../../lib/mock-cart-repository";

interface AddToCartButtonProps {
  productId?: string;
}

function AddToCartButtonView({ productId }: AddToCartButtonProps) {
  const { addItem } = useCartStore();
  const fallbackProduct = getMockProducts()[0] ?? {
    id: "prod_fallback",
    name: "Тестовый товар",
    slug: "fallback-product",
    priceCents: 0,
    stock: 1,
  };
  const selectedProductId = productId ?? fallbackProduct.id;

  return (
    <Button
      onClick={() => {
        addItem(selectedProductId);
      }}
      type="button"
    >
      <ShoppingCart className="size-4" aria-hidden="true" />
      Добавить в корзину
    </Button>
  );
}

export function AddToCartButton(props: AddToCartButtonProps) {
  return (
    <CartStoreProvider>
      <AddToCartButtonView {...props} />
    </CartStoreProvider>
  );
}

export default AddToCartButton;
