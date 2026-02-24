import { defineConfig } from "@tanstack/start/config";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  tsr: {
    routesDirectory: "./app/routes",
    generatedRouteTree: "./app/routeTree.gen.ts",
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "~": fileURLToPath(new URL("./app", import.meta.url)),
      },
    },
  },
  server: {
    preset: "vercel",
  },
});
