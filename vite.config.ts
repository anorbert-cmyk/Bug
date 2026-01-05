import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: true, // Enable source maps for debugging
    rollupOptions: {
      output: {
        manualChunks(id) {
          // IMPORTANT: Exclude recharts and its dependencies from vendor-react
          // These use Function("return this") which violates CSP
          // They should only be loaded on Admin page (lazy loaded)
          if (id.includes('recharts') || id.includes('d3-') || id.includes('decimal.js') || id.includes('lodash')) {
            // Don't assign to any chunk - let Vite bundle with the importing page
            return undefined;
          }
          
          // Core React - needed everywhere (must be first to ensure proper initialization)
          if (id.includes('react-dom') || id.includes('react/') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          // Router - small, needed for navigation
          if (id.includes('wouter')) {
            return 'vendor-react';
          }
          // UI components - lazy load with pages that use them
          if (id.includes('@radix-ui')) {
            return 'vendor-ui';
          }
          // Utility functions - small, can be in main bundle
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'vendor-utils';
          }
        },
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
