import { Button, Container, Price } from "@w1zll/shop-ui";
import { useEffect, useState } from "react";

import "../../remote-styles";
import { getOrder } from "../../lib/cart-api";
import { Order } from "../../lib/cart-types";

export function CheckoutSuccessPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("orderId");

    if (!orderId) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    let isCurrent = true;

    getOrder(orderId)
      .then((response) => {
        if (isCurrent) {
          setOrder(response);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setIsError(true);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return (
    <Container className="py-10">
      <section className="mx-auto max-w-2xl space-y-5 rounded-lg border border-[var(--shop-border)] p-6 text-center">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--shop-primary)]">Заказ оплачен</p>
          <h1 className="text-3xl font-semibold tracking-normal">Спасибо за заказ</h1>
          <p className="text-sm leading-6 text-[var(--shop-muted-foreground)]">
            Mock payment прошел успешно. Историю и статус заказа можно посмотреть в аккаунте.
          </p>
          {isLoading ? (
            <p className="text-sm text-[var(--shop-muted-foreground)]">Считаем начисленные бонусы...</p>
          ) : null}
          {order ? (
            <p className="text-base font-medium">
              За этот заказ начислено <Price valueCents={order.earnedBonusCents} /> бонусов.
            </p>
          ) : null}
          {isError ? (
            <p className="text-sm text-[var(--shop-muted-foreground)]">
              Информацию о бонусах можно посмотреть в истории заказов.
            </p>
          ) : null}
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
