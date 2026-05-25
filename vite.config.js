import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { collectImagePathsFromDirectory } from "./scripts/site-media-collect.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Dev-only: full list = public/ + dist/ (if you have run a build), same idea as hosting. */
function siteMediaDevPlugin() {
  return {
    name: "site-media-dev-index",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (url !== "/__site-media.json") return next();
        const root = server.config.root;
        const pub = path.resolve(root, "public");
        const dist = path.resolve(root, "dist");
        const fromPublic = collectImagePathsFromDirectory(pub);
        const fromDist = fs.existsSync(dist) ? collectImagePathsFromDirectory(dist) : [];
        const merged = [...new Set([...fromPublic, ...fromDist])].sort((a, b) => a.localeCompare(b));
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(merged));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase") || id.includes("@firebase")) return "firebase";
          if (id.includes("react-dom") || id.includes("/react/")) return "react-vendor";
          if (id.includes("react-router")) return "router";
          if (id.includes("qrcode")) return "qrcode";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
  server: {
    proxy: process.env.VITE_DEV_API_PROXY
      ? {
          "/api": {
            target: process.env.VITE_DEV_API_PROXY.replace(/\/+$/, ""),
            changeOrigin: true,
          },
        }
      : {},
  },
  plugins: [react(), siteMediaDevPlugin()],
  resolve: {
    /** node-qrcode defaults to server build; browser entry uses DOM canvas/SVG. */
    alias: {
      qrcode: path.resolve(__dirname, "node_modules/qrcode/lib/browser.js"),
    },
  },
});
