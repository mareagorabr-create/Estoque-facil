import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Estoque Fácil",
        short_name: "Estoque Fácil",
        description: "Controle de estoque simples para pequenos comércios.",
        lang: "pt-BR",
        start_url: "/",
        display: "standalone",
        background_color: "#F8FAFC",
        theme_color: "#22C55E",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // cacheia o app shell; dados do usuário ficam no IndexedDB
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/$/,
            handler: "NetworkFirst",
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
  },
});
