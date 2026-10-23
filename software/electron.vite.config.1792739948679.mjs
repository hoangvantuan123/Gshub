// electron.vite.config.mjs
import { resolve } from "path";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
var __electron_vite_injected_dirname = "C:\\Users\\it06\\Gshub\\software";
var electron_vite_config_default = defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve(__electron_vite_injected_dirname, "src/renderer/src"),
        "react-responsive-carousel": resolve(
          __electron_vite_injected_dirname,
          "src/renderer/src/shims/react-responsive-carousel.jsx"
        ),
        marked: resolve(__electron_vite_injected_dirname, "src/renderer/src/shims/marked.js")
      }
    },
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: true
    },
    build: {
      chunkSizeWarningLimit: 4e3,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              if (id.includes("antd") || id.includes("@ant-design") || id.includes("rc-")) {
                return "vendor-antd";
              }
              if (id.includes("@glideapps")) {
                return "vendor-glide";
              }
              if (id.includes("exceljs")) {
                return "vendor-excel";
              }
              if (id.includes("html2canvas")) {
                return "vendor-canvas";
              }
              if (id.includes("pako") || id.includes("crypto-js")) {
                return "vendor-crypto";
              }
            }
          }
        }
      }
    },
    esbuild: {
      jsxFactory: "React.createElement",
      jsxInject: `import React from 'react'`
    }
  }
});
export {
  electron_vite_config_default as default
};
