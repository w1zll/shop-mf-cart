import { ShoppingCart } from "lucide-react";
import { Button } from "@w1zll/shop-ui";

import "../../remote-styles";
import { CartStoreProvider, useCartStore } from "../../lib/cart-store";

export interface AddToCartButtonProps {
  className?: string;
  disabled?: boolean;
  maxQuantity?: number;
  productId: string;
}

function AddToCartButtonView({
  className,
  disabled = false,
  maxQuantity = 1,
  productId,
}: AddToCartButtonProps) {
  const { addItem } = useCartStore();
  const isDisabled = disabled || maxQuantity < 1;
  const buttonClassName = [isDisabled ? undefined : "cursor-pointer", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Button
      className={buttonClassName}
      disabled={isDisabled}
      onClick={() => {
        addItem(productId, 1);
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
