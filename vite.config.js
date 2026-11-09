import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/chart.js')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/cytoscape')) {
            return 'vendor-graph';
          }
          if (id.includes('node_modules/lucide')) {
            return 'vendor-icons';
          }
        }
      }
    }
  },
  test: {
    environment: 'node',
    globals: true
  }
});
