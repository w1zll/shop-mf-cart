import {
  dispatchShopEvent,
  SHOP_BROADCAST_CHANNELS,
  SHOP_EVENTS,
  subscribeShopEvent,
} from "@w1zll/shop-ui/contracts";

export const CART_CHANGED_EVENT = SHOP_EVENTS.cartChanged;
export const AUTH_CHANGED_EVENT = SHOP_EVENTS.authChanged;
export const CART_BROADCAST_CHANNEL = SHOP_BROADCAST_CHANNELS.cart;

type CartBroadcastMessage = {
  type: string;
};

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel() {
  if (typeof window === "undefined" || !("BroadcastChannel" in window)) {
    return null;
  }

  broadcastChannel ??= new BroadcastChannel(CART_BROADCAST_CHANNEL);

  return broadcastChannel;
}

export function notifyCartChanged() {
  if (typeof window === "undefined") {
    return;
  }

  dispatchShopEvent(CART_CHANGED_EVENT, {});
  getBroadcastChannel()?.postMessage({ type: CART_CHANGED_EVENT } satisfies CartBroadcastMessage);
}

export function subscribeCartChanged(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const channel = getBroadcastChannel();

  const unsubscribeWindowEvent = subscribeShopEvent(CART_CHANGED_EVENT, () => {
    callback();
  });

  function handleChannelMessage(event: MessageEvent<CartBroadcastMessage>) {
    if (event.data.type === CART_CHANGED_EVENT) {
      callback();
    }
  }

  channel?.addEventListener("message", handleChannelMessage);

  return () => {
    unsubscribeWindowEvent();
    channel?.removeEventListener("message", handleChannelMessage);
  };
}
export function subscribeAuthChanged(callback: (isAuthenticated: boolean) => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  return subscribeShopEvent(AUTH_CHANGED_EVENT, (event) => {
    callback(event.detail.isAuthenticated);
  });
}
