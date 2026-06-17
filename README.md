# Shop Cart Remote

`shop-mf-cart` - React remote для корзины демонстрационного магазина на микрофронтендах.

## Ответственность

- индикатор корзины для Header;
- мини-корзина;
- кнопка добавления товара;
- страница корзины;
- страница checkout;
- клиентское состояние корзины;
- exposed-компоненты для shell/catalog через Module Federation.

На текущем этапе используется mock repository без подключения к API.

## Технологии

- React;
- TypeScript strict;
- Rspack;
- Module Federation Enhanced;
- Tailwind CSS 4;
- `@w1zll/shop-ui`;
- TanStack Query;
- React Hook Form;
- Zod;
- Vitest;
- React Testing Library.

## Локальная разработка

Перед установкой зависимостей нужен доступ к GitHub Packages для `@w1zll/shop-ui`.
Токен не хранится в репозитории. Registry для scope настроен в `.npmrc`, auth token должен быть в user-level `~/.npmrc`.

```bash
pnpm install
pnpm dev
```

Локальный адрес:

```text
http://localhost:3002
```

## Standalone routes

```text
/
/cart
/checkout
/components
```

## Module Federation

Remote name:

```text
cart
```

Exposes:

```text
./CartIndicator
./CartDrawer
./AddToCartButton
./CartPage
./CheckoutPage
```

После сборки артефакты находятся в `dist`.

Ожидаемые public URLs при локальной разработке:

```text
http://localhost:3002/remoteEntry.js
http://localhost:3002/mf-manifest.json
```

React и ReactDOM настроены как singleton shared dependencies с версией `19.2.7`, как в `shop-shell` и `shop-catalog`.

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Текущие ограничения

- API ещё не подключен;
- состояние корзины хранится в mock repository внутри remote;
- синхронизация anonymous cart, optimistic updates и CSRF будут добавлены на следующих этапах;
- checkout форма пока не создаёт заказ.
