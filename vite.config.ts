import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      hmr: false,
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "script-defer",
        devOptions: {
          enabled: false,
        },
        includeAssets: ["favicon.ico", "favicon.png", "robots.txt", "apple-touch-icon.png"],
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          globPatterns: ["**/*.{css,html,ico,woff2}"],
          globIgnores: [
            "**/assets/aistudio/**",
            "**/vendor-pdf-*.js",
            "**/vendor-charts-*.js",
            "**/Manage*.js",
          ],
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/llms\.txt$/,
            /^\/robots\.txt$/,
            /^\/sitemap\.xml$/,
          ],
          importScripts: ["/custom-sw.js"],
          runtimeCaching: [
            {
              urlPattern: /\/assets\/.*\.js$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "app-js-chunks",
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 14,
                },
              },
            },
            {
              urlPattern: /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|api\.fontshare\.com|cdnjs\.cloudflare\.com)\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "external-static-resources",
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff|woff2)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-images-fonts",
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          id: "/",
          name: "DEEP SHOP",
          short_name: "DEEP SHOP",
          description: "Premium border cross phones, original mobiles, and community Loops in BD",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/favicon.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/favicon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/favicon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
    optimizeDeps: {
      include: [
        "firebase/app",
        "firebase/auth",
        "firebase/firestore",
        "firebase/messaging",
        "react",
        "react-dom",
        "react-dom/client",
        "react-router-dom",
        "framer-motion"
      ]
    },
    build: {
      sourcemap: false,
      minify: "esbuild",
      chunkSizeWarningLimit: 3000,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === "INVALID_ANNOTATION") return;
          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
            return undefined;
          },
        },
      },
    },
    esbuild: {
      drop: mode === "production" ? ["console", "debugger"] : [],
    },
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(process.cwd()),
        "lucide-react": path.resolve(
          process.cwd(),
          "src/streamline-flex-shim.tsx"
        ),
      },
    },
  };
});
