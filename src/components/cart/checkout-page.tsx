import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Container, Input, Label, Price } from "@w1zll/shop-ui";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CartStoreProvider, useCartStore } from "../../lib/cart-store";

const checkoutSchema = z.object({
  city: z.string().min(2, "Укажите город"),
  name: z.string().min(2, "Укажите имя"),
  phone: z.string().min(5, "Укажите телефон"),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

function CheckoutPageView() {
  const { cart } = useCartStore();
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      city: "",
      name: "",
      phone: "",
    },
  });

  function onSubmit() {
    return;
  }

  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Оформление заказа</h1>
          <p className="mt-2 text-sm text-[var(--shop-muted-foreground)]">
            Форма checkout пока не создаёт заказ, но читает актуальную корзину из API.
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input id="name" {...register("name")} />
            {errors.name ? (
              <p className="text-sm text-[var(--shop-destructive)]">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" {...register("phone")} />
            {errors.phone ? (
              <p className="text-sm text-[var(--shop-destructive)]">{errors.phone.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Город</Label>
            <Input id="city" {...register("city")} />
            {errors.city ? (
              <p className="text-sm text-[var(--shop-destructive)]">{errors.city.message}</p>
            ) : null}
          </div>
          <Button disabled={isSubmitting || cart.items.length === 0} type="submit">
            Создать mock заказ
          </Button>
        </form>
      </section>

      <aside className="h-fit space-y-3 rounded-lg border border-[var(--shop-border)] p-4">
        <h2 className="font-semibold">Сводка</h2>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--shop-muted-foreground)]">Товаров</span>
          <span>{cart.summary.totalQuantity}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--shop-muted-foreground)]">Итого</span>
          <Price className="font-semibold" valueCents={cart.summary.totalCents} />
        </div>
      </aside>
    </Container>
  );
}

export function CheckoutPage() {
  return (
    <CartStoreProvider>
      <CheckoutPageView />
    </CartStoreProvider>
  );
}

export default CheckoutPage;
