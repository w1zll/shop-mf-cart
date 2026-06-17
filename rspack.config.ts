import { ModuleFederationPlugin } from "@module-federation/enhanced/rspack";
import { HtmlRspackPlugin, type Configuration } from "@rspack/core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reactVersion = "19.2.7";
const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: Configuration = {
  context: dirname,
  entry: {
    main: "./src/main.tsx",
  },
  output: {
    clean: true,
    publicPath: "auto",
    path: path.resolve(dirname, "dist"),
  },
  devServer: {
    historyApiFallback: true,
    hot: true,
    port: 3002,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: {
              syntax: "typescript",
              tsx: true,
            },
            transform: {
              react: {
                runtime: "automatic",
              },
            },
          },
        },
        type: "javascript/auto",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
        type: "javascript/auto",
      },
      {
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  plugins: [
    new HtmlRspackPlugin({
      chunks: ["main"],
      template: "./src/index.html",
    }),
    new ModuleFederationPlugin({
      name: "cart",
      filename: "remoteEntry.js",
      exposes: {
        "./CartIndicator": "./src/components/cart/cart-indicator.tsx",
        "./CartDrawer": "./src/components/cart/cart-drawer.tsx",
        "./AddToCartButton": "./src/components/cart/add-to-cart-button.tsx",
        "./CartPage": "./src/components/cart/cart-page.tsx",
        "./CheckoutPage": "./src/components/cart/checkout-page.tsx",
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: reactVersion,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: reactVersion,
        },
      },
    }),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
};

export default config;
