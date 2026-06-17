export const CART_CHANGED_EVENT = "shop:cart-changed";
export const CART_BROADCAST_CHANNEL = "shop:cart";

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

  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
  getBroadcastChannel()?.postMessage({ type: CART_CHANGED_EVENT } satisfies CartBroadcastMessage);
}

export function subscribeCartChanged(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const channel = getBroadcastChannel();

  function handleWindowEvent() {
    callback();
  }

  function handleChannelMessage(event: MessageEvent<CartBroadcastMessage>) {
    if (event.data.type === CART_CHANGED_EVENT) {
      callback();
    }
  }

  window.addEventListener(CART_CHANGED_EVENT, handleWindowEvent);
  channel?.addEventListener("message", handleChannelMessage);

  return () => {
    window.removeEventListener(CART_CHANGED_EVENT, handleWindowEvent);
    channel?.removeEventListener("message", handleChannelMessage);
  };
}
