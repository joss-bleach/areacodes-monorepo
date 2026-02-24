import { config as reactInternalConfig } from "./react-internal.js";

/**
 * ESLint configuration for TanStack Start apps.
 * File-based routing uses default exports so import/no-default-export is disabled.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...reactInternalConfig,
  {
    rules: {
      "import/no-default-export": "off",
    },
  },
];
