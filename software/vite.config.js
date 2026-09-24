import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      'react-responsive-carousel': resolve(
        __dirname,
        'src/renderer/src/shims/react-responsive-carousel.jsx'
      ),
      marked: resolve(__dirname, 'src/renderer/src/shims/marked.js')
    }
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxInject: `import React from 'react'`
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  },
  optimizeDeps: {
    include: ['@glideapps/glide-data-grid', '@glideapps/glide-data-grid-cells']
  }
})
