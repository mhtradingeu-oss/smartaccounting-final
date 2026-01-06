import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

const shouldAnalyze = process.env.ANALYZE === 'true';
const serverPort = Number(process.env.VITE_DEV_PORT || 3000);
const devServerHost = process.env.VITE_DEV_HOST || '0.0.0.0';
const hmrHost = process.env.VITE_HMR_HOST;
const hmrClientPort = Number(process.env.VITE_HMR_CLIENT_PORT || serverPort);
const hmrProtocol = process.env.VITE_HMR_PROTOCOL || 'ws';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  const hmrConfig = {
    port: serverPort,
    clientPort: hmrClientPort,
    protocol: hmrProtocol,
    overlay: false,
    timeout: 60000,
  };

  if (hmrHost) {
    hmrConfig.host = hmrHost;
  }

  return {
    plugins: [
      react(),
      shouldAnalyze &&
        visualizer({
          filename: 'dist/bundle-analysis.html',
          gzipSize: true,
          brotliSize: true,
          open: false,
          template: 'treemap',
        }),
    ].filter(Boolean),

    server: isProduction
      ? {
          port: 3000,
          proxy: {
            '/api': {
              target: 'http://localhost:5001',
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : {
          host: devServerHost,
          port: serverPort,
          allowedHosts: [
            'localhost',
            '.replit.dev',
            '.replit.com',
            /\.spock\.replit\.dev$/,
            /\.riker\.replit\.dev$/,
            /\.kirk\.replit\.dev$/,
          ],
          hmr: hmrConfig,
          watch: {
            usePolling: true,
          },
          proxy: {
            '/api': {
              target: 'http://localhost:5001',
              changeOrigin: true,
              secure: false,
            },
          },
        },

    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        clsx: path.resolve(__dirname, './src/lib/clsx.js'),
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
          },
        },
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'axios', '@heroicons/react/24/outline'],
    },

    define: {
      global: 'globalThis',
      'process.env': {
        REACT_APP_DISABLE_LOGIN: JSON.stringify(process.env.REACT_APP_DISABLE_LOGIN || ''),
      },
    },
  };
});
