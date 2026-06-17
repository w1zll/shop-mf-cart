import { Button, EmptyState, ErrorState, LoadingState, Price } from "@w1zll/shop-ui";

import { CartStoreProvider, useCartStore } from "../../lib/cart-store";

function CartDrawerView() {
  const { cart, removeItem, state, updateQuantity } = useCartStore();

  if (state === "loading") {
    return <LoadingState title="Загружаем корзину" />;
  }

  if (state === "error") {
    return <ErrorState title="Корзина недоступна" description="Попробуйте повторить позже." />;
  }

  return (
    <aside className="w-full max-w-md space-y-4 rounded-lg border border-[var(--shop-border)] bg-[var(--shop-card)] p-4 shadow-[var(--shop-shadow-md)]">
      <div>
        <h2 className="text-lg font-semibold">Мини-корзина</h2>
        <p className="text-sm text-[var(--shop-muted-foreground)]">Mock состояние cart remote.</p>
      </div>

      {cart.items.length === 0 ? (
        <EmptyState description="Добавьте товар из демо-списка." title="Корзина пуста" />
      ) : (
        <div className="space-y-3">
          {cart.items.map((item) => (
            <div
              className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-[var(--shop-border)] p-3"
              key={item.id}
            >
              <div>
                <h3 className="text-sm font-semibold">{item.product.name}</h3>
                <p className="mt-1 text-sm text-[var(--shop-muted-foreground)]">
                  <Price valueCents={item.product.priceCents} /> x {item.quantity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  aria-label="Уменьшить количество"
                  className="size-8 p-0"
                  disabled={item.quantity <= 1}
                  onClick={() => {
                    updateQuantity(item.id, item.quantity - 1);
                  }}
                  type="button"
                  variant="outline"
                >
                  -
                </Button>
                <span className="min-w-5 text-center text-sm">{item.quantity}</span>
                <Button
                  aria-label="Увеличить количество"
                  className="size-8 p-0"
                  disabled={item.quantity >= item.product.stock}
                  onClick={() => {
                    updateQuantity(item.id, item.quantity + 1);
                  }}
                  type="button"
                  variant="outline"
                >
                  +
                </Button>
                <Button
                  onClick={() => {
                    removeItem(item.id);
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--shop-border)] pt-4">
        <span className="text-sm text-[var(--shop-muted-foreground)]">Итого</span>
        <Price className="font-semibold" valueCents={cart.summary.totalCents} />
      </div>
      <Button asChild className="w-full">
        <a href="/cart">Открыть корзину</a>
      </Button>
    </aside>
  );
}

export function CartDrawer() {
  return (
    <CartStoreProvider>
      <CartDrawerView />
    </CartStoreProvider>
  );
}

export default CartDrawer;
