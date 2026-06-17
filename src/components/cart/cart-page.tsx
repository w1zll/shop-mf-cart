import { Button, Container, EmptyState, ErrorState, LoadingState, Price } from "@w1zll/shop-ui";

import { CartStoreProvider, useCartStore } from "../../lib/cart-store";

function CartPageView() {
  const { cart, clearCart, removeItem, state, updateQuantity } = useCartStore();

  if (state === "loading") {
    return <LoadingState label="Загружаем корзину" />;
  }

  if (state === "error") {
    return <ErrorState title="Корзина временно недоступна" description="Cart API не отвечает." />;
  }

  return (
    <Container className="space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal">Корзина</h1>
        <p className="text-sm text-[var(--shop-muted-foreground)]">
          Корзина хранится на сервере и синхронизируется через Cart API.
        </p>
      </div>

      {cart.items.length === 0 ? (
        <EmptyState
          action={
            <Button asChild variant="outline">
              <a href="/catalog">Вернуться в каталог</a>
            </Button>
          }
          description="Пока в корзине нет товаров."
          title="Корзина пуста"
        />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {cart.items.map((item) => (
              <article
                className="grid gap-4 rounded-lg border border-[var(--shop-border)] p-4 sm:grid-cols-[1fr_auto]"
                key={item.id}
              >
                <div>
                  <h2 className="font-semibold">{item.product.name}</h2>
                  <p className="mt-1 text-sm text-[var(--shop-muted-foreground)]">
                    Остаток: {item.product.stock}
                  </p>
                  <Price className="mt-3 block font-semibold" valueCents={item.product.priceCents} />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    aria-label="Уменьшить количество"
                    className="size-9 p-0"
                    disabled={item.quantity <= 1}
                    onClick={() => {
                      updateQuantity(item.id, item.quantity - 1);
                    }}
                    type="button"
                    variant="outline"
                  >
                    -
                  </Button>
                  <span className="min-w-8 text-center">{item.quantity}</span>
                  <Button
                    aria-label="Увеличить количество"
                    className="size-9 p-0"
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
                    type="button"
                    variant="ghost"
                  >
                    Удалить
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit space-y-4 rounded-lg border border-[var(--shop-border)] p-4">
            <h2 className="font-semibold">Итого</h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--shop-muted-foreground)]">Товаров</span>
              <span>{cart.summary.totalQuantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--shop-muted-foreground)]">Сумма</span>
              <Price className="font-semibold" valueCents={cart.summary.totalCents} />
            </div>
            <Button asChild className="w-full">
              <a href="/checkout">Оформить заказ</a>
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                clearCart();
              }}
              type="button"
              variant="outline"
            >
              Очистить
            </Button>
          </aside>
        </section>
      )}
    </Container>
  );
}

export function CartPage() {
  return (
    <CartStoreProvider>
      <CartPageView />
    </CartStoreProvider>
  );
}

export default CartPage;
