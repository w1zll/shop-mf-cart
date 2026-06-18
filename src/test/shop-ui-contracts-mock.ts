export const SHOP_EVENTS = {
  cartChanged: "shop:cart-changed",
  accountChanged: "shop:account-changed",
  favoritesChanged: "shop:favorites-changed",
  authChanged: "shop:auth-changed",
} as const;

export const SHOP_BROADCAST_CHANNELS = {
  cart: "shop:cart",
  account: "shop:account",
  favorites: "shop:favorites",
  auth: "shop:auth",
} as const;

export type ShopEventName = (typeof SHOP_EVENTS)[keyof typeof SHOP_EVENTS];

export interface ShopEventDetailMap {
  [SHOP_EVENTS.cartChanged]: Record<string, never>;
  [SHOP_EVENTS.accountChanged]: { userId: string | null };
  [SHOP_EVENTS.favoritesChanged]: { isFavorite: boolean; productId: string };
  [SHOP_EVENTS.authChanged]: { isAuthenticated: boolean; userId?: string | null };
}

export type ShopEventDetail<Name extends ShopEventName> = ShopEventDetailMap[Name];
export type ShopCustomEvent<Name extends ShopEventName> = CustomEvent<ShopEventDetail<Name>>;
export type ShopEventListener<Name extends ShopEventName> = (
  event: ShopCustomEvent<Name>,
) => void;

export function dispatchShopEvent<Name extends ShopEventName>(
  name: Name,
  detail: ShopEventDetail<Name>,
  target: EventTarget = window,
) {
  return target.dispatchEvent(new CustomEvent(name, { detail }));
}

export function subscribeShopEvent<Name extends ShopEventName>(
  name: Name,
  listener: ShopEventListener<Name>,
  options: { target?: EventTarget } = {},
) {
  const target = options.target ?? window;
  const eventListener: EventListener = (event) => {
    listener(event as ShopCustomEvent<Name>);
  };

  target.addEventListener(name, eventListener);

  return () => {
    target.removeEventListener(name, eventListener);
  };
}
