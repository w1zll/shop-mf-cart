import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ComponentType } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import rspackConfig from "../rspack.config";
import * as AddToCartButtonModule from "./components/cart/add-to-cart-button";
import * as CartDrawerModule from "./components/cart/cart-drawer";
import * as CartIndicatorModule from "./components/cart/cart-indicator";
import * as CartPageModule from "./components/cart/cart-page";
import * as CheckoutPageModule from "./components/cart/checkout-page";
import { resetCartQueryClientForTests } from "./lib/cart-query";

type ModuleFederationOptions = {
  filename: string;
  exposes: Record<string, string>;
  name: string;
  shared: Record<string, { requiredVersion?: string; singleton?: boolean }>;
};

type FederationPlugin = {
  _options: ModuleFederationOptions;
};

type ExposedModule = {
  default: ComponentType<never>;
} & Record<string, unknown>;

type Manifest = {
  id: string;
  name: string;
  metaData: {
    globalName: string;
    remoteEntry: {
      name: string;
      path: string;
    };
  };
  exposes: Array<{
    assets: {
      js: {
        async: string[];
        sync: string[];
      };
    };
    name: string;
    path: string;
  }>;
  shared: Array<{
    name: string;
    requiredVersion: string;
    singleton: boolean;
    version: string;
  }>;
};

const expectedExposes = {
  "./CartIndicator": "./src/components/cart/cart-indicator.tsx",
  "./CartDrawer": "./src/components/cart/cart-drawer.tsx",
  "./AddToCartButton": "./src/components/cart/add-to-cart-button.tsx",
  "./CartPage": "./src/components/cart/cart-page.tsx",
  "./CheckoutPage": "./src/components/cart/checkout-page.tsx",
} as const;

const expectedExposeNames = Object.keys(expectedExposes).map((expose) => expose.slice(2));
const distPath = path.resolve(process.cwd(), "dist");
const manifestPath = path.join(distPath, "mf-manifest.json");

const exposedModules = [
  {
    expose: "./CartIndicator",
    exportName: "CartIndicator",
    module: CartIndicatorModule as unknown as ExposedModule,
    props: {},
  },
  {
    expose: "./CartDrawer",
    exportName: "CartDrawer",
    module: CartDrawerModule as unknown as ExposedModule,
    props: {},
  },
  {
    expose: "./AddToCartButton",
    exportName: "AddToCartButton",
    module: AddToCartButtonModule as unknown as ExposedModule,
    props: { productId: "product-1" },
  },
  {
    expose: "./CartPage",
    exportName: "CartPage",
    module: CartPageModule as unknown as ExposedModule,
    props: {},
  },
  {
    expose: "./CheckoutPage",
    exportName: "CheckoutPage",
    module: CheckoutPageModule as unknown as ExposedModule,
    props: {},
  },
] as const;

const emptyCartResponse = {
  id: "cart-1",
  isAnonymous: true,
  items: [],
  summary: {
    itemsCount: 0,
    totalQuantity: 0,
    subtotalCents: 0,
  },
};

function createResponse(body: unknown, status = 200) {
  return {
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

function isFederationPlugin(plugin: unknown): plugin is FederationPlugin {
  return typeof plugin === "object" && plugin !== null && "_options" in plugin;
}

function getFederationOptions(): ModuleFederationOptions {
  const plugins: readonly unknown[] = rspackConfig.plugins ?? [];
  const federationPlugin = plugins.find(isFederationPlugin);

  if (!federationPlugin) {
    throw new Error("ModuleFederationPlugin was not found in rspack config");
  }

  return federationPlugin._options;
}

function readManifest() {
  const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));

  return manifest as Manifest;
}

function assertAssetExists(assetName: string) {
  expect(existsSync(path.join(distPath, assetName))).toBe(true);
}

afterEach(() => {
  cleanup();
  resetCartQueryClientForTests();
  vi.unstubAllGlobals();
});

describe("Module Federation source contract", () => {
  it("keeps remote name, entry file and expose names stable", () => {
    const options = getFederationOptions();

    expect(options.name).toBe("cart");
    expect(options.filename).toBe("remoteEntry.js");
    expect(options.exposes).toEqual(expectedExposes);
  });

  it("keeps React shared as singleton with the current React version", () => {
    const options = getFederationOptions();

    expect(options.shared.react).toMatchObject({
      requiredVersion: React.version,
      singleton: true,
    });
    expect(options.shared["react-dom"]).toMatchObject({
      requiredVersion: React.version,
      singleton: true,
    });
  });

  it("exports default and named components for every expose", () => {
    for (const exposedModule of exposedModules) {
      expect(typeof exposedModule.module.default).toBe("function");
      expect(exposedModule.module[exposedModule.exportName]).toBe(exposedModule.module.default);
    }
  });

  it.each(exposedModules)(
    "renders $expose without host-specific wrappers",
    async ({ module, props }) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createResponse(emptyCartResponse)));

      const Component = module.default as ComponentType<Record<string, unknown>>;
      const { container } = render(<Component {...props} />);

      await waitFor(() => {
        expect(container.firstElementChild).toBeTruthy();
      });
    },
  );
});

describe.skipIf(!existsSync(manifestPath))("Module Federation build manifest contract", () => {
  it("emits manifest and remote entry for the cart remote", () => {
    const manifest = readManifest();

    expect(manifest.id).toBe("cart");
    expect(manifest.name).toBe("cart");
    expect(manifest.metaData.globalName).toBe("cart");
    expect(manifest.metaData.remoteEntry.name).toBe("remoteEntry.js");
    assertAssetExists("remoteEntry.js");
  });

  it("emits the expected exposes and their JS assets", () => {
    const manifest = readManifest();

    expect(manifest.exposes.map((expose) => expose.path)).toEqual(Object.keys(expectedExposes));
    expect(manifest.exposes.map((expose) => expose.name)).toEqual(expectedExposeNames);

    for (const expose of manifest.exposes) {
      expect(expose.assets.js.sync).toContain(`__federation_expose_${expose.name}.js`);

      for (const assetName of [...expose.assets.js.sync, ...expose.assets.js.async]) {
        assertAssetExists(assetName);
      }
    }
  });

  it("emits React shared dependencies as singleton", () => {
    const manifest = readManifest();

    expect(
      manifest.shared.map((dependency) => ({
        name: dependency.name,
        requiredVersion: dependency.requiredVersion,
        singleton: dependency.singleton,
        version: dependency.version,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          name: "react",
          requiredVersion: React.version,
          singleton: true,
          version: React.version,
        },
        {
          name: "react-dom",
          requiredVersion: React.version,
          singleton: true,
          version: React.version,
        },
      ]),
    );
  });
});
