import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: [
        "icons/icon-180.png",
        "icons/icon-192.png",
        "icons/icon-512.png"
      ],
      manifest: {
        name: "SmashDex",
        short_name: "SmashDex",
        description: "Tinder-style Pokemon smash or pass deck.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#f6f1e6",
        theme_color: "#ff6b2d",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/css2?.*$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts-css",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/s\/.*$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/pokeapi\.co\/api\/v2\/.*$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "pokeapi-json",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            urlPattern:
              /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/.*$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "poke-sprites",
              expiration: {
                maxEntries: 1200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern:
              /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/cries\/.*$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "poke-cries",
              expiration: {
                maxEntries: 400,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
