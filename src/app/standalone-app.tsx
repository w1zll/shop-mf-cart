import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Button, Container, Logo } from "@w1zll/shop-ui";
import { useEffect, useMemo, useState } from "react";

import { AddToCartButton } from "../components/cart/add-to-cart-button";
import { CartDrawer } from "../components/cart/cart-drawer";
import { CartIndicator } from "../components/cart/cart-indicator";
import { CartPage } from "../components/cart/cart-page";
import { CheckoutPage } from "../components/cart/checkout-page";

const routes = ["/", "/cart", "/checkout", "/components"] as const;
type StandaloneRoute = (typeof routes)[number];

function readRoute(): StandaloneRoute {
  const pathname = window.location.pathname;
  return routes.includes(pathname as StandaloneRoute) ? (pathname as StandaloneRoute) : "/";
}

function StandaloneHeader() {
  const [route, setRoute] = useState<StandaloneRoute>(() => readRoute());

  useEffect(() => {
    function handlePopState() {
      setRoute(readRoute());
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function navigate(nextRoute: StandaloneRoute) {
    window.history.pushState(null, "", nextRoute);
    setRoute(nextRoute);
  }

  return (
    <>
      <header className="border-b border-[var(--shop-border)]">
        <Container className="flex min-h-16 items-center justify-between gap-4">
          <button
            aria-label="На главную"
            className="appearance-none border-0 bg-transparent p-0"
            onClick={() => {
              navigate("/");
            }}
            type="button"
          >
            <Logo />
          </button>
          <nav className="flex items-center gap-2" aria-label="Навигация cart remote">
            <Button
              onClick={() => {
                navigate("/cart");
              }}
              type="button"
              variant="ghost"
            >
              Корзина
            </Button>
            <Button
              onClick={() => {
                navigate("/checkout");
              }}
              type="button"
              variant="ghost"
            >
              Checkout
            </Button>
            <Button
              onClick={() => {
                navigate("/components");
              }}
              type="button"
              variant="ghost"
            >
              Components
            </Button>
            <CartIndicator />
          </nav>
        </Container>
      </header>
      <StandaloneRouteContent route={route} />
    </>
  );
}

function StandaloneRouteContent({ route }: Readonly<{ route: StandaloneRoute }>) {
  if (route === "/cart") {
    return <CartPage />;
  }

  if (route === "/checkout") {
    return <CheckoutPage />;
  }

  if (route === "/components") {
    return (
      <Container className="grid gap-6 py-8 lg:grid-cols-[1fr_420px]">
        <section className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-normal">Компоненты cart remote</h1>
          <p className="text-sm text-[var(--shop-muted-foreground)]">
            Здесь можно проверить exposed-компоненты до подключения shell. Для добавления товара
            нужен реальный productId из API.
          </p>
          <div className="flex flex-wrap gap-3">
            <AddToCartButton productId="cmqf30a900006qcu0pvxdn8jr" />
          </div>
        </section>
        <CartDrawer />
      </Container>
    );
  }

  return (
    <Container className="space-y-6 py-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-normal">Cart remote</h1>
        <p className="text-base leading-7 text-[var(--shop-muted-foreground)]">
          Standalone-приложение для разработки корзины. Данные загружаются через Cart API.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <AddToCartButton productId="cmqf30a900006qcu0pvxdn8jr" />
        <Button asChild variant="outline">
          <a href="/cart">Открыть корзину</a>
        </Button>
      </div>
    </Container>
  );
}

export function StandaloneApp() {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <StandaloneHeader />
    </QueryClientProvider>
  );
}
