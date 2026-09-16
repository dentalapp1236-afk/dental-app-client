import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // Vercel sets VERCEL_GIT_COMMIT_REF (the branch being built) as a build-time
  // process env var, not a client-exposed one — bake it into the bundle so
  // src/api/axios.js can tell a staging build from the real production build
  // (both are Vite "production mode" builds, so import.meta.env.PROD alone
  // can't distinguish them).
  define: {
    "import.meta.env.VITE_GIT_BRANCH": JSON.stringify(process.env.VERCEL_GIT_COMMIT_REF || ""),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      // "autoUpdate" since retirement: a waiting worker would let someone tap
      // "Later" and keep using the retired app indefinitely. The handover build
      // must take over on its own.
      registerType: "autoUpdate",
      // We register the SW ourselves via `virtual:pwa-register/react` inside the
      // app bundle (external, hashed JS) — CSP-safe with no 'unsafe-inline'.
      injectRegister: null,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "MyDentalBooking",
        short_name: "MyDentalBooking",
        description:
          "Find dentists nearby, book appointments, manage clients, supplies and finances.",
        theme_color: "#ffffff",
        background_color: "#f2f6fc",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
      },
      devOptions: { enabled: true, type: "module" },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
