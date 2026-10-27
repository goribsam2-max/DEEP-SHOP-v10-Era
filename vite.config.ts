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
        devOptions: {
          enabled: false,
        },
        includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
        workbox: {
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB limit
          importScripts: ["/custom-sw.js"]
        },
        manifest: {
          name: "DEEP SHOP",
          short_name: "DEEP SHOP",
          description: "Premium border cross phones, original mobiles and tech products in BD",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          start_url: ".",
          icons: [
            {
              src: "/favicon.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "/favicon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
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
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("jspdf") || id.includes("html2canvas")) return "vendor-pdf";
            if (
              id.includes("@hugeicons") ||
              id.includes("@phosphor-icons") ||
              id.includes("@remixicon")
            ) {
              return "vendor-icons";
            }
            if (id.includes("framer-motion") || id.includes("/motion/")) {
              return "vendor-motion";
            }
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
