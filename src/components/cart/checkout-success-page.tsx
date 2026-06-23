import { Button, Container } from "@w1zll/shop-ui";

import "../../remote-styles";

export function CheckoutSuccessPage() {
  return (
    <Container className="py-10">
      <section className="mx-auto max-w-2xl space-y-5 rounded-lg border border-[var(--shop-border)] p-6 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--shop-primary)]">Заказ оплачен</p>
          <h1 className="text-3xl font-semibold tracking-normal">Спасибо за заказ</h1>
          <p className="text-sm leading-6 text-[var(--shop-muted-foreground)]">
            Mock payment прошел успешно. Историю и статус заказа можно посмотреть в аккаунте.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <a href="/account/orders">Открыть заказы</a>
          </Button>
          <Button asChild variant="outline">
            <a href="/catalog">Вернуться в каталог</a>
          </Button>
        </div>
      </section>
    </Container>
  );
}

export default CheckoutSuccessPage;
