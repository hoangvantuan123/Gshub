import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        'react-responsive-carousel': resolve(
          __dirname,
          'src/renderer/src/shims/react-responsive-carousel.jsx'
        ),
        marked: resolve(__dirname, 'src/renderer/src/shims/marked.js')
      }
    },
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true
    },
    esbuild: {
      jsxFactory: 'React.createElement',
      jsxInject: `import React from 'react'`
    }
  }
})
