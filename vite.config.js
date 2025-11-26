import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import fs from 'fs'

// Custom plugin to prevent browser decompression of dictionary files
const dictionaryHeaderPlugin = () => ({
  name: 'dictionary-header',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && req.url.includes('.dat.gz')) {
        try {
          fs.appendFileSync('middleware_debug.log', `Serving: ${req.url}\n`);
        } catch (e) { }
        res.setHeader('Content-Encoding', 'identity');
        res.setHeader('Content-Type', 'application/gzip');
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['path', 'util', 'stream', 'buffer', 'zlib'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
    dictionaryHeaderPlugin(),
  ],
  resolve: {
    alias: {
      path: 'path-browserify',
    },
  },
  base: '/gyoushi_reader/',
  optimizeDeps: {
    include: ['kuromoji', 'zlibjs'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          kuromoji: ['kuromoji'],
        },
      },
    },
  },
})
