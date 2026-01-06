import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// Custom plugin to fix modulepreload order - ensures vendor-react loads BEFORE main bundle
function modulePreloadOrderPlugin() {
  return {
    name: 'modulepreload-order-fix',
    enforce: 'post' as const,
    transformIndexHtml(html: string) {
      // Extract all modulepreload links
      const preloadRegex = /<link[^>]*rel="modulepreload"[^>]*>/g;
      const preloads = html.match(preloadRegex) || [];
      
      // Sort them: vendor-react first, then vendor-ui, then vendor-utils, then others
      const sorted = preloads.sort((a, b) => {
        const getOrder = (link: string) => {
          if (link.includes('00-vendor-react') || link.includes('vendor-react')) return 0;
          if (link.includes('01-vendor-ui') || link.includes('vendor-ui')) return 1;
          if (link.includes('02-vendor-utils') || link.includes('vendor-utils')) return 2;
          return 3;
        };
        return getOrder(a) - getOrder(b);
      });
      
      // Remove all original preloads
      let result = html.replace(preloadRegex, '');
      
      // Find the main script tag and insert sorted preloads BEFORE it
      const mainScriptMatch = result.match(/<script[^>]*type="module"[^>]*src="[^"]*index[^"]*"[^>]*>/);
      if (mainScriptMatch) {
        const insertPoint = result.indexOf(mainScriptMatch[0]);
        result = result.slice(0, insertPoint) + sorted.join('\n    ') + '\n    ' + result.slice(insertPoint);
      }
      
      return result;
    }
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), modulePreloadOrderPlugin()];

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
        // Fix blank page error by ensuring vendor-react loads before main bundle
        // Use numeric prefixes to control modulepreload order (alphabetical)
        chunkFileNames: (chunkInfo) => {
          // Prioritize vendor-react to load first
          if (chunkInfo.name === 'vendor-react') {
            return 'assets/00-vendor-react-[hash].js';  // ← Loads FIRST
          }
          if (chunkInfo.name === 'vendor-ui') {
            return 'assets/01-vendor-ui-[hash].js';     // ← Loads SECOND
          }
          if (chunkInfo.name === 'vendor-utils') {
            return 'assets/02-vendor-utils-[hash].js';  // ← Loads THIRD
          }
          return 'assets/[name]-[hash].js';
        },
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
