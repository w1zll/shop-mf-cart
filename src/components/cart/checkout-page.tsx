import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Container,
  EmptyState,
  ErrorState,
  Input,
  Label,
  LoadingState,
  Price,
} from "@w1zll/shop-ui";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import "../../remote-styles";
import { createOrder, getCurrentUser, payOrderMock } from "../../lib/cart-api";
import { notifyCartChanged } from "../../lib/cart-events";
import { CartStoreProvider, useCartStore } from "../../lib/cart-store";
import { Order } from "../../lib/cart-types";

const checkoutSteps = ["contacts", "delivery", "confirm", "payment"] as const;
type CheckoutStep = (typeof checkoutSteps)[number];
type AuthState = "loading" | "authenticated" | "anonymous" | "error";

const checkoutSchema = z.object({
  apartment: z.string().optional(),
  bonusToSpend: z.coerce.number().int().min(0, "Бонусы не могут быть отрицательными").default(0),
  city: z.string().min(2, "Укажите город"),
  deliveryMethod: z.enum(["PICKUP", "COURIER"]),
  house: z.string().min(1, "Укажите дом"),
  name: z.string().min(2, "Укажите имя"),
  phone: z.string().min(5, "Укажите телефон"),
  postalCode: z.string().min(4, "Укажите индекс"),
  street: z.string().min(2, "Укажите улицу"),
});

type CheckoutFormInput = z.input<typeof checkoutSchema>;
type CheckoutFormValues = z.output<typeof checkoutSchema>;

const stepLabels: Record<CheckoutStep, string> = {
  contacts: "Контакты",
  delivery: "Доставка",
  confirm: "Подтверждение",
  payment: "Имитация оплаты",
};

const stepFields: Record<Exclude<CheckoutStep, "payment">, Array<keyof CheckoutFormValues>> = {
  contacts: ["name", "phone"],
  delivery: ["city", "street", "house", "postalCode", "deliveryMethod", "apartment"],
  confirm: ["bonusToSpend"],
};

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `mock-${String(Date.now())}`;
}

function getNextStep(step: CheckoutStep): CheckoutStep {
  return checkoutSteps[Math.min(checkoutSteps.indexOf(step) + 1, checkoutSteps.length - 1)] ?? step;
}

function getPreviousStep(step: CheckoutStep): CheckoutStep {
  return checkoutSteps[Math.max(checkoutSteps.indexOf(step) - 1, 0)] ?? step;
}

function CheckoutPageView() {
  const { cart, state } = useCartStore();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [step, setStep] = useState<CheckoutStep>("contacts");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const idempotencyKey = useMemo(createIdempotencyKey, []);
  const {
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    trigger,
  } = useForm<CheckoutFormInput, unknown, CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      apartment: "",
      bonusToSpend: 0,
      city: "",
      deliveryMethod: "PICKUP",
      house: "",
      name: "",
      phone: "",
      postalCode: "",
      street: "",
    },
  });

  const isBusy = isSubmitting || isCreatingOrder || isPaying;

  useEffect(() => {
    let isCurrent = true;

    getCurrentUser()
      .then((response) => {
        if (isCurrent) {
          setAuthState(response?.user ? "authenticated" : "anonymous");
        }
      })
      .catch(() => {
        if (isCurrent) {
          setAuthState("error");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  async function goNext() {
    setFormError(null);

    if (step === "payment") {
      return;
    }

    const isValid = await trigger(stepFields[step], { shouldFocus: true });

    if (!isValid) {
      return;
    }

    setStep(getNextStep(step));
  }

  async function onSubmit(values: CheckoutFormValues) {
    if (cart.items.length === 0) {
      setFormError("Корзина пуста.");
      return;
    }

    if (authState !== "authenticated") {
      setFormError("Войдите в аккаунт, чтобы оформить заказ.");
      return;
    }

    setFormError(null);
    setIsCreatingOrder(true);

    try {
      const order = await createOrder({
        apartment: values.apartment?.trim() || undefined,
        bonusToSpend: values.bonusToSpend,
        city: values.city,
        deliveryMethod: values.deliveryMethod,
        house: values.house,
        name: values.name,
        phone: values.phone,
        postalCode: values.postalCode,
        street: values.street,
      });

      setCreatedOrder(order);
      setStep("payment");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось создать заказ.");
    } finally {
      setIsCreatingOrder(false);
    }
  }

  async function payOrder() {
    if (!createdOrder) {
      return;
    }

    setFormError(null);
    setIsPaying(true);

    try {
      const paidOrder = await payOrderMock(createdOrder.id, idempotencyKey);

      notifyCartChanged();
      window.location.assign(`/checkout/successful?orderId=${encodeURIComponent(paidOrder.id)}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось выполнить mock payment.");
      setIsPaying(false);
    }
  }

  if (state === "loading") {
    return <LoadingState label="Загружаем корзину для оформления" />;
  }

  if (authState === "loading") {
    return <LoadingState label="Проверяем сессию" />;
  }

  if (state === "error") {
    return (
      <Container className="py-8">
        <ErrorState
          title="Checkout временно недоступен"
          description="Cart API не отвечает. Попробуйте обновить страницу."
        />
      </Container>
    );
  }

  if (authState === "error") {
    return (
      <Container className="py-8">
        <ErrorState
          title="Не удалось проверить сессию"
          description="Обновите страницу или попробуйте войти заново."
        />
      </Container>
    );
  }

  if (authState === "anonymous") {
    return (
      <Container className="py-8">
        <EmptyState
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <a href="/login">Войти</a>
              </Button>
              <Button asChild variant="outline">
                <a href="/register">Создать аккаунт</a>
              </Button>
            </div>
          }
          description="Оформление заказа доступно только для авторизованных покупателей."
          title="Нужно войти"
        />
      </Container>
    );
  }

  return (
    <Container className="grid gap-6 py-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal">Оформление заказа</h1>
          <p className="text-sm text-[var(--shop-muted-foreground)]">
            Заказ создаётся на сервере из текущей корзины. Стоимость пересчитывает API.
          </p>
        </div>

        <ol className="grid gap-2 sm:grid-cols-4" aria-label="Шаги оформления">
          {checkoutSteps.map((item, index) => (
            <li
              className={`rounded-lg border px-3 py-2 text-sm ${
                item === step
                  ? "border-[var(--shop-primary)] bg-[var(--shop-primary)] text-[var(--shop-primary-foreground)]"
                  : "border-[var(--shop-border)] text-[var(--shop-muted-foreground)]"
              }`}
              key={item}
            >
              {index + 1}. {stepLabels[item]}
            </li>
          ))}
        </ol>

        {formError ? (
          <div
            className="rounded-lg border border-[var(--shop-destructive)] p-3 text-sm text-[var(--shop-destructive)]"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <form
          className="space-y-5"
          onSubmit={(event) => {
            void handleSubmit(onSubmit)(event);
          }}
        >
          {step === "contacts" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldError htmlFor="name" label="Имя" error={errors.name?.message}>
                <Input id="name" autoComplete="name" {...register("name")} />
              </FieldError>
              <FieldError htmlFor="phone" label="Телефон" error={errors.phone?.message}>
                <Input id="phone" autoComplete="tel" {...register("phone")} />
              </FieldError>
            </div>
          ) : null}

          {step === "delivery" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldError htmlFor="city" label="Город" error={errors.city?.message}>
                <Input id="city" autoComplete="address-level2" {...register("city")} />
              </FieldError>
              <FieldError htmlFor="street" label="Улица" error={errors.street?.message}>
                <Input id="street" autoComplete="address-line1" {...register("street")} />
              </FieldError>
              <FieldError htmlFor="house" label="Дом" error={errors.house?.message}>
                <Input id="house" autoComplete="address-line2" {...register("house")} />
              </FieldError>
              <FieldError htmlFor="apartment" label="Квартира" error={errors.apartment?.message}>
                <Input id="apartment" autoComplete="address-line3" {...register("apartment")} />
              </FieldError>
              <FieldError htmlFor="postalCode" label="Индекс" error={errors.postalCode?.message}>
                <Input id="postalCode" autoComplete="postal-code" {...register("postalCode")} />
              </FieldError>
              <FieldError htmlFor="deliveryMethod" label="Способ доставки" error={errors.deliveryMethod?.message}>
                <select
                  className="h-10 w-full rounded-md border border-[var(--shop-input)] bg-[var(--shop-background)] px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-ring)] sm:text-sm"
                  id="deliveryMethod"
                  {...register("deliveryMethod")}
                >
                  <option value="PICKUP">Самовывоз</option>
                  <option value="COURIER">Курьер</option>
                </select>
              </FieldError>
            </div>
          ) : null}

          {step === "confirm" ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-[var(--shop-border)] p-4">
                <h2 className="font-semibold">Проверьте заказ</h2>
                <dl className="mt-3 grid gap-2 text-sm">
                  <SummaryRow label="Получатель" value={`${getValues("name")}, ${getValues("phone")}`} />
                  <SummaryRow
                    label="Адрес"
                    value={`${getValues("city")}, ${getValues("street")} ${getValues("house")}`}
                  />
                  <SummaryRow
                    label="Доставка"
                    value={getValues("deliveryMethod") === "PICKUP" ? "Самовывоз" : "Курьер"}
                  />
                </dl>
              </div>
              <FieldError htmlFor="bonusToSpend" label="Бонусы к списанию" error={errors.bonusToSpend?.message}>
                <Input id="bonusToSpend" min={0} type="number" {...register("bonusToSpend")} />
              </FieldError>
            </div>
          ) : null}

          {step === "payment" ? (
            <div className="space-y-4 rounded-lg border border-[var(--shop-border)] p-4">
              <h2 className="font-semibold">Имитация оплаты</h2>
              <p className="text-sm text-[var(--shop-muted-foreground)]">
                Заказ {createdOrder?.number} создан. Нажмите кнопку, чтобы выполнить mock payment.
              </p>
              <Button
                disabled={isBusy || !createdOrder}
                onClick={() => {
                  void payOrder();
                }}
                type="button"
              >
                {isPaying ? "Оплачиваем..." : "Оплатить mock payment"}
              </Button>
            </div>
          ) : null}

          {step !== "payment" ? (
            <div className="flex flex-wrap gap-3">
              {step !== "contacts" ? (
                <Button
                  disabled={isBusy}
                  onClick={() => {
                    setStep(getPreviousStep(step));
                  }}
                  type="button"
                  variant="outline"
                >
                  Назад
                </Button>
              ) : null}
              {step === "confirm" ? (
                <Button disabled={isBusy || cart.items.length === 0} type="submit">
                  {isCreatingOrder ? "Создаём заказ..." : "Создать заказ"}
                </Button>
              ) : (
                <Button
                  disabled={isBusy || cart.items.length === 0}
                  onClick={() => {
                    void goNext();
                  }}
                  type="button"
                >
                  Далее
                </Button>
              )}
            </div>
          ) : null}
        </form>
      </section>

      <aside className="h-fit space-y-3 rounded-lg border border-[var(--shop-border)] p-4">
        <h2 className="font-semibold">Сводка</h2>
        <SummaryRow label="Товаров" value={String(cart.summary.totalQuantity)} />
        <div className="space-y-2 border-t border-[var(--shop-border)] pt-3">
          {cart.items.map((item) => (
            <div className="flex items-start justify-between gap-3 text-sm" key={item.id}>
              <span>{item.product.name}</span>
              <span className="shrink-0">x {item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--shop-border)] pt-3">
          <span className="text-sm text-[var(--shop-muted-foreground)]">Итого</span>
          <Price className="font-semibold" valueCents={cart.summary.totalCents} />
        </div>
      </aside>
    </Container>
  );
}

function FieldError({
  children,
  error,
  htmlFor,
  label,
}: Readonly<{ children: React.ReactNode; error?: string; htmlFor: string; label: string }>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-[var(--shop-destructive)]">{error}</p> : null}
    </div>
  );
}

function SummaryRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-[var(--shop-muted-foreground)]">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
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
