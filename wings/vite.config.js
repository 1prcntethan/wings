import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/entry-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: null,
      workbox: {
        globPatterns: ["index.html", "assets/entry-*.js", "assets/index-*.css"],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "wings-chunks" },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "wings-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      includeAssets: [
        "wingslogo.ico",
        "wingslogo192.png",
        "wingslogo512.png",
        "apple-touch-icon.png",
        "wingslogo-maskable-192.png",
        "wingslogo-maskable-512.png",
      ],
      manifest: {
        id: "/",
        name: "WINGS",
        short_name: "WINGS",
        description: "Calisthenics skill tracking and workout logging",
        lang: "en",
        theme_color: "#1b1b1b",
        background_color: "#1b1b1b",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "wingslogo192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "wingslogo512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "wingslogo-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "wingslogo-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
});
