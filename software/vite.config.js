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
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) {
              return 'vendor-antd'
            }
            if (id.includes('@glideapps')) {
              return 'vendor-glide'
            }
            if (id.includes('exceljs')) {
              return 'vendor-excel'
            }
            if (id.includes('html2canvas')) {
              return 'vendor-canvas'
            }
            if (id.includes('pako') || id.includes('crypto-js')) {
              return 'vendor-crypto'
            }
          }
        }
      }
    },
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
