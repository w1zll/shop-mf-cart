import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@w1zll/shop-ui/contracts": "/src/test/shop-ui-contracts-mock.ts",
      "@w1zll/shop-ui": "/src/test/shop-ui-mock.tsx",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
