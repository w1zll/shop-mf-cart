import { afterEach, describe, expect, it, vi } from "vitest";

interface CartBroadcastMessage {
  type: string;
}

class TestBroadcastChannel {
  static instances: TestBroadcastChannel[] = [];

  readonly messages: CartBroadcastMessage[] = [];
  private readonly listeners = new Set<EventListener>();

  constructor(readonly name: string) {
    TestBroadcastChannel.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === "message" && typeof listener === "function") {
      this.listeners.add(listener);
    }
  }

  emit(message: CartBroadcastMessage) {
    this.listeners.forEach((listener) => {
      listener(new MessageEvent("message", { data: message }));
    });
  }

  postMessage(message: CartBroadcastMessage) {
    this.messages.push(message);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === "message" && typeof listener === "function") {
      this.listeners.delete(listener);
    }
  }
}

function installBroadcastChannelMock() {
  TestBroadcastChannel.instances = [];
  vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
  Object.defineProperty(window, "BroadcastChannel", {
    configurable: true,
    value: TestBroadcastChannel,
  });
}

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe("cart events", () => {
  it("notifies the current window and the cart broadcast channel", async () => {
    installBroadcastChannelMock();
    const { CART_BROADCAST_CHANNEL, CART_CHANGED_EVENT, notifyCartChanged } = await import(
      "./cart-events"
    );
    const listener = vi.fn();

    window.addEventListener(CART_CHANGED_EVENT, listener);
    notifyCartChanged();
    window.removeEventListener(CART_CHANGED_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(TestBroadcastChannel.instances[0]?.name).toBe(CART_BROADCAST_CHANNEL);
    expect(TestBroadcastChannel.instances[0]?.messages).toEqual([
      { type: CART_CHANGED_EVENT },
    ]);
  });

  it("subscribes to window and broadcast cart changed events", async () => {
    installBroadcastChannelMock();
    const { CART_CHANGED_EVENT, subscribeCartChanged } = await import("./cart-events");
    const callback = vi.fn();

    const unsubscribe = subscribeCartChanged(callback);

    window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: {} }));
    TestBroadcastChannel.instances[0]?.emit({ type: CART_CHANGED_EVENT });
    TestBroadcastChannel.instances[0]?.emit({ type: "shop:other-event" });

    expect(callback).toHaveBeenCalledTimes(2);

    unsubscribe();
    window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT, { detail: {} }));
    TestBroadcastChannel.instances[0]?.emit({ type: CART_CHANGED_EVENT });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("subscribes to auth changed events with auth state only", async () => {
    const { AUTH_CHANGED_EVENT, subscribeAuthChanged } = await import("./cart-events");
    const callback = vi.fn();

    const unsubscribe = subscribeAuthChanged(callback);

    window.dispatchEvent(
      new CustomEvent(AUTH_CHANGED_EVENT, {
        detail: { isAuthenticated: true, userId: "user-1" },
      }),
    );

    unsubscribe();
    window.dispatchEvent(
      new CustomEvent(AUTH_CHANGED_EVENT, {
        detail: { isAuthenticated: false, userId: null },
      }),
    );

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(true);
  });
});
