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

На текущем этапе cart remote подключён к Cart API и Orders API через browser-запросы к `/api/v1`.

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

Для полноценной проверки рядом должен быть запущен `shop-api`:

```text
http://localhost:4000
```

Standalone dev-server проксирует `/api/*` на `http://localhost:4000`, поэтому компоненты могут
использовать same-origin запросы даже при запуске remote отдельно.
При проксировании dev-server отправляет в API `Origin: http://localhost:3000`, потому что
локальная проверка CSRF/Origin в `shop-api` доверяет shell-origin.

Переменные окружения для standalone proxy:

```text
API_ORIGIN=http://localhost:4000
API_REQUEST_ORIGIN=http://localhost:3000
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

Dev-server отдаёт Module Federation manifest, remote entry и chunks с CORS-заголовком
`Access-Control-Allow-Origin: *`, чтобы shell на `http://localhost:3000` мог загрузить remote
в браузере.

React и ReactDOM настроены как singleton shared dependencies с версией `19.2.7`, как в `shop-shell` и `shop-catalog`.

## Cart API

Все browser-запросы выполняются относительно:

```text
/api/v1
```

При standalone deploy на Vercel `/api/v1/*` переписывается на Vercel Function `api/proxy.js`.
Она проксирует запросы в `API_ORIGIN` и передаёт cookies обратно браузеру.
Для production standalone-проверки нужно задать:

```text
API_ORIGIN=https://<render-api-host>
API_REQUEST_ORIGIN=https://<cart-remote-host>
```

Для всех запросов используется:

```text
credentials: include
```

Перед `POST`, `PATCH` и `DELETE` remote вызывает:

```text
GET /api/v1/auth/csrf
```

Полученный `csrfToken` отправляется в заголовке:

```text
X-CSRF-Token
```

TanStack Query keys:

```text
cart
cartSummary
```

После успешных mutations remote обновляет query cache, отправляет browser event
`shop:cart-changed` и сообщение в `BroadcastChannel` `shop:cart`. Имена события и канала
берутся из `@w1zll/shop-ui/contracts`, чтобы shell, catalog и remotes использовали один контракт.

`AddToCartButton` принимает только минимальный контракт:

```text
productId
disabled
maxQuantity
className
```

Компонент не получает весь Product.

## Checkout UI

`CheckoutPage` использует React Hook Form и Zod. Форма разбита на простые шаги:

```text
Контакты
Доставка
Подтверждение
Имитация оплаты
```

После подтверждения remote вызывает:

```text
POST /api/v1/orders
```

После создания заказа шаг оплаты вызывает:

```text
POST /api/v1/orders/:id/pay/mock
```

Для mock payment генерируется `idempotencyKey`. После успешной оплаты remote отправляет событие
изменения корзины и переводит пользователя на:

```text
/checkout/success?orderId=...
```

## Проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Текущие ограничения

- standalone-кнопка добавления требует реальный `productId` из API;
- страница `/checkout/success` будет оформлена в shell на следующем consumer-этапе.
