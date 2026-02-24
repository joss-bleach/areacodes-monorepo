import { defineConfig } from "@tanstack/start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  tsr: {
    routesDirectory: "./app/routes",
    generatedRouteTree: "./app/routeTree.gen.ts",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    preset: "vercel",
  },
});
