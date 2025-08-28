import { defineConfig } from '@qwik.dev/core/config';

export default defineConfig({
  dev: {
    // Increase timeout for development
    timeout: 30000, // 30 seconds
  },
  build: {
    // Ensure proper chunking for better performance
    minify: false, // Keep as is to resolve syntax errors
  },
  routes: {
    // Configure route-specific settings
    timeout: 15000, // 15 seconds for route transitions
  }
});