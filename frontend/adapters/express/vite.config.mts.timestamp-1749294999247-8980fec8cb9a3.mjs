// adapters/express/vite.config.mts
import { nodeServerAdapter } from "file:///home/vendure/rottenhand/frontend/node_modules/.pnpm/@qwik.dev+router@2.0.0-alpha.10_acorn@8.14.1_rollup@4.41.1_typescript@5.3.3_vite@5.4.6_@types+node@20.11.17_/node_modules/@qwik.dev/router/lib/adapters/node-server/vite/index.mjs";
import { extendConfig } from "file:///home/vendure/rottenhand/frontend/node_modules/.pnpm/@qwik.dev+router@2.0.0-alpha.10_acorn@8.14.1_rollup@4.41.1_typescript@5.3.3_vite@5.4.6_@types+node@20.11.17_/node_modules/@qwik.dev/router/lib/vite/index.mjs";

// vite.config.ts
import { qwikRouter } from "file:///home/vendure/rottenhand/frontend/node_modules/.pnpm/@qwik.dev+router@2.0.0-alpha.10_acorn@8.14.1_rollup@4.41.1_typescript@5.3.3_vite@5.4.6_@types+node@20.11.17_/node_modules/@qwik.dev/router/lib/vite/index.mjs";
import { qwikVite } from "file:///home/vendure/rottenhand/frontend/node_modules/.pnpm/@qwik.dev+core@2.0.0-alpha.10_prettier@3.2.5_vite@5.4.6_@types+node@20.11.17_/node_modules/@qwik.dev/core/dist/optimizer.mjs";
import { defineConfig } from "file:///home/vendure/rottenhand/frontend/node_modules/.pnpm/vite@5.4.6_@types+node@20.11.17/node_modules/vite/dist/node/index.js";
import tsconfigPaths from "file:///home/vendure/rottenhand/frontend/node_modules/.pnpm/vite-tsconfig-paths@4.3.1_typescript@5.3.3_vite@5.4.6_@types+node@20.11.17_/node_modules/vite-tsconfig-paths/dist/index.mjs";
import { imagetools } from "file:///home/vendure/rottenhand/frontend/node_modules/.pnpm/vite-imagetools@7.1.0_rollup@4.41.1/node_modules/vite-imagetools/dist/index.js";
var vite_config_default = defineConfig((config) => {
  const isDev = config.mode === "development";
  return {
    logLevel: isDev ? "warn" : "error",
    // Suppress info logs in development
    base: "/",
    // Ensure root-relative URLs
    build: {
      sourcemap: isDev,
      minify: !isDev,
      // Security: Minify in production using esbuild (default)
      outDir: "dist",
      // Ensure output goes to dist/
      rollupOptions: {
        output: {
          // JS files to dist/build/
          entryFileNames: "build/[name]-[hash].js",
          chunkFileNames: "build/[name]-[hash].js",
          // CSS and other non-image assets to dist/build/, images to dist/ root
          assetFileNames: (assetInfo) => {
            if (/\.(css)$/.test(assetInfo.name ?? "")) {
              return "build/[name]-[hash][extname]";
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name ?? "")) {
              return "[name]-[hash][extname]";
            }
            return "build/[name]-[hash][extname]";
          }
        }
      }
    },
    plugins: [
      qwikRouter(),
      qwikVite({
        devTools: {
          clickToSource: false
        },
        srcDir: "src",
        debug: false,
        entryStrategy: {
          type: "smart"
        }
      }),
      tsconfigPaths(),
      imagetools()
    ],
    preview: {
      host: "0.0.0.0",
      port: 4e3,
      headers: {
        // Caching
        "Cache-Control": "public, max-age=600",
        // Security Headers
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Content-Security-Policy": [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          // Qwik needs unsafe-inline
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://rottenhand.com",
          "frame-ancestors 'none'"
        ].join("; ")
      }
    },
    server: isDev ? {
      watch: {
        ignored: ["node_modules/**", ".git/**"]
      },
      fs: {
        allow: [".."]
        // Allow serving files from one level up
      }
    } : void 0
  };
});

// adapters/express/vite.config.mts
var vite_config_default2 = extendConfig(vite_config_default, () => {
  return {
    build: {
      ssr: true,
      outDir: "server",
      rollupOptions: {
        input: ["src/entry.express.tsx", "@qwik-router-config"],
        output: {
          entryFileNames: "entry.express.js",
          chunkFileNames: "[name]-[hash].js",
          assetFileNames: "[name]-[hash][extname]"
        }
      }
    },
    plugins: [nodeServerAdapter({ name: "express" })]
  };
});
export {
  vite_config_default2 as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYWRhcHRlcnMvZXhwcmVzcy92aXRlLmNvbmZpZy5tdHMiLCAidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS92ZW5kdXJlL2RhbW5lZGRlc2lnbnMvZnJvbnRlbmQvYWRhcHRlcnMvZXhwcmVzc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvdmVuZHVyZS9kYW1uZWRkZXNpZ25zL2Zyb250ZW5kL2FkYXB0ZXJzL2V4cHJlc3Mvdml0ZS5jb25maWcubXRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3ZlbmR1cmUvZGFtbmVkZGVzaWducy9mcm9udGVuZC9hZGFwdGVycy9leHByZXNzL3ZpdGUuY29uZmlnLm10c1wiO2ltcG9ydCB7IG5vZGVTZXJ2ZXJBZGFwdGVyIH0gZnJvbSBcIkBxd2lrLmRldi9yb3V0ZXIvYWRhcHRlcnMvbm9kZS1zZXJ2ZXIvdml0ZVwiO1xuaW1wb3J0IHsgZXh0ZW5kQ29uZmlnIH0gZnJvbSBcIkBxd2lrLmRldi9yb3V0ZXIvdml0ZVwiO1xuaW1wb3J0IGJhc2VDb25maWcgZnJvbSBcIi4uLy4uL3ZpdGUuY29uZmlnLnRzXCI7IC8vIEFkanVzdGVkIHBhdGhcblxuZXhwb3J0IGRlZmF1bHQgZXh0ZW5kQ29uZmlnKGJhc2VDb25maWcsICgpID0+IHtcbiAgcmV0dXJuIHtcbiAgICBidWlsZDoge1xuICAgICAgc3NyOiB0cnVlLFxuICAgICAgb3V0RGlyOiBcInNlcnZlclwiLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBpbnB1dDogW1wic3JjL2VudHJ5LmV4cHJlc3MudHN4XCIsIFwiQHF3aWstcm91dGVyLWNvbmZpZ1wiXSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6IFwiZW50cnkuZXhwcmVzcy5qc1wiLFxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiBcIltuYW1lXS1baGFzaF0uanNcIixcbiAgICAgICAgICBhc3NldEZpbGVOYW1lczogXCJbbmFtZV0tW2hhc2hdW2V4dG5hbWVdXCIsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgcGx1Z2luczogW25vZGVTZXJ2ZXJBZGFwdGVyKHsgbmFtZTogXCJleHByZXNzXCIgfSldLFxuICB9O1xufSk7IiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS92ZW5kdXJlL2RhbW5lZGRlc2lnbnMvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9ob21lL3ZlbmR1cmUvZGFtbmVkZGVzaWducy9mcm9udGVuZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS92ZW5kdXJlL2RhbW5lZGRlc2lnbnMvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBxd2lrUm91dGVyIH0gZnJvbSAnQHF3aWsuZGV2L3JvdXRlci92aXRlJztcbmltcG9ydCB7IHF3aWtWaXRlIH0gZnJvbSAnQHF3aWsuZGV2L2NvcmUvb3B0aW1pemVyJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHRzY29uZmlnUGF0aHMgZnJvbSAndml0ZS10c2NvbmZpZy1wYXRocyc7XG5pbXBvcnQgeyBpbWFnZXRvb2xzIH0gZnJvbSAndml0ZS1pbWFnZXRvb2xzJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKChjb25maWcpID0+IHtcbiAgY29uc3QgaXNEZXYgPSBjb25maWcubW9kZSA9PT0gJ2RldmVsb3BtZW50JztcblxuICByZXR1cm4ge1xuICAgIGxvZ0xldmVsOiBpc0RldiA/ICd3YXJuJyA6ICdlcnJvcicsIC8vIFN1cHByZXNzIGluZm8gbG9ncyBpbiBkZXZlbG9wbWVudFxuICAgIGJhc2U6ICcvJywgLy8gRW5zdXJlIHJvb3QtcmVsYXRpdmUgVVJMc1xuICAgIGJ1aWxkOiB7XG4gICAgICBzb3VyY2VtYXA6IGlzRGV2LFxuICAgICAgbWluaWZ5OiAhaXNEZXYsIC8vIFNlY3VyaXR5OiBNaW5pZnkgaW4gcHJvZHVjdGlvbiB1c2luZyBlc2J1aWxkIChkZWZhdWx0KVxuICAgICAgb3V0RGlyOiAnZGlzdCcsIC8vIEVuc3VyZSBvdXRwdXQgZ29lcyB0byBkaXN0L1xuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAvLyBKUyBmaWxlcyB0byBkaXN0L2J1aWxkL1xuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYnVpbGQvW25hbWVdLVtoYXNoXS5qcycsXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdidWlsZC9bbmFtZV0tW2hhc2hdLmpzJyxcbiAgICAgICAgICAvLyBDU1MgYW5kIG90aGVyIG5vbi1pbWFnZSBhc3NldHMgdG8gZGlzdC9idWlsZC8sIGltYWdlcyB0byBkaXN0LyByb290XG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICAgIGlmICgvXFwuKGNzcykkLy50ZXN0KGFzc2V0SW5mby5uYW1lID8/ICcnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2J1aWxkL1tuYW1lXS1baGFzaF1bZXh0bmFtZV0nO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfGdpZnxzdmd8d2VicHxhdmlmKSQvLnRlc3QoYXNzZXRJbmZvLm5hbWUgPz8gJycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnW25hbWVdLVtoYXNoXVtleHRuYW1lXSc7IC8vIEltYWdlcyB0byBkaXN0LyByb290XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBPdGhlciBhc3NldHMgKGUuZy4sIGZvbnRzKSB0byBkaXN0L2J1aWxkL1xuICAgICAgICAgICAgcmV0dXJuICdidWlsZC9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdJztcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIHBsdWdpbnM6IFtcbiAgICAgIHF3aWtSb3V0ZXIoKSxcbiAgICAgIHF3aWtWaXRlKHtcbiAgICAgICAgZGV2VG9vbHM6IHtcbiAgICAgICAgICBjbGlja1RvU291cmNlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgc3JjRGlyOiAnc3JjJyxcbiAgICAgICAgZGVidWc6IGZhbHNlLFxuICAgICAgICBlbnRyeVN0cmF0ZWd5OiB7XG4gICAgICAgICAgdHlwZTogJ3NtYXJ0JyxcbiAgICAgICAgfSxcbiAgICAgIH0pLFxuICAgICAgdHNjb25maWdQYXRocygpLFxuICAgICAgaW1hZ2V0b29scygpLFxuICAgIF0sXG4gICAgcHJldmlldzoge1xuICAgICAgaG9zdDogJzAuMC4wLjAnLFxuICAgICAgcG9ydDogNDAwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgLy8gQ2FjaGluZ1xuICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICdwdWJsaWMsIG1heC1hZ2U9NjAwJyxcbiAgICAgICAgLy8gU2VjdXJpdHkgSGVhZGVyc1xuICAgICAgICAnWC1Db250ZW50LVR5cGUtT3B0aW9ucyc6ICdub3NuaWZmJyxcbiAgICAgICAgJ1gtRnJhbWUtT3B0aW9ucyc6ICdERU5ZJyxcbiAgICAgICAgJ1gtWFNTLVByb3RlY3Rpb24nOiAnMTsgbW9kZT1ibG9jaycsXG4gICAgICAgICdSZWZlcnJlci1Qb2xpY3knOiAnc3RyaWN0LW9yaWdpbi13aGVuLWNyb3NzLW9yaWdpbicsXG4gICAgICAgICdQZXJtaXNzaW9ucy1Qb2xpY3knOiAnY2FtZXJhPSgpLCBtaWNyb3Bob25lPSgpLCBnZW9sb2NhdGlvbj0oKScsXG4gICAgICAgICdDb250ZW50LVNlY3VyaXR5LVBvbGljeSc6IFtcbiAgICAgICAgICBcImRlZmF1bHQtc3JjICdzZWxmJ1wiLFxuICAgICAgICAgIFwic2NyaXB0LXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnXCIsIC8vIFF3aWsgbmVlZHMgdW5zYWZlLWlubGluZVxuICAgICAgICAgIFwic3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZSdcIixcbiAgICAgICAgICBcImltZy1zcmMgJ3NlbGYnIGRhdGE6IGh0dHBzOlwiLFxuICAgICAgICAgIFwiZm9udC1zcmMgJ3NlbGYnIGRhdGE6XCIsXG4gICAgICAgICAgXCJjb25uZWN0LXNyYyAnc2VsZicgaHR0cHM6Ly9kYW1uZWRkZXNpZ25zLmNvbVwiLFxuICAgICAgICAgIFwiZnJhbWUtYW5jZXN0b3JzICdub25lJ1wiLFxuICAgICAgICBdLmpvaW4oJzsgJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiBpc0RldlxuICAgICAgPyB7XG4gICAgICAgICAgd2F0Y2g6IHtcbiAgICAgICAgICAgIGlnbm9yZWQ6IFsnbm9kZV9tb2R1bGVzLyoqJywgJy5naXQvKionXSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGZzOiB7XG4gICAgICAgICAgICBhbGxvdzogWycuLiddLCAvLyBBbGxvdyBzZXJ2aW5nIGZpbGVzIGZyb20gb25lIGxldmVsIHVwXG4gICAgICAgICAgfSxcbiAgICAgICAgfVxuICAgICAgOiB1bmRlZmluZWQsXG4gIH07XG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQW1WLFNBQVMseUJBQXlCO0FBQ3JYLFNBQVMsb0JBQW9COzs7QUNEaVEsU0FBUyxrQkFBa0I7QUFDelQsU0FBUyxnQkFBZ0I7QUFDekIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxtQkFBbUI7QUFDMUIsU0FBUyxrQkFBa0I7QUFFM0IsSUFBTyxzQkFBUSxhQUFhLENBQUMsV0FBVztBQUN0QyxRQUFNLFFBQVEsT0FBTyxTQUFTO0FBRTlCLFNBQU87QUFBQSxJQUNMLFVBQVUsUUFBUSxTQUFTO0FBQUE7QUFBQSxJQUMzQixNQUFNO0FBQUE7QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFdBQVc7QUFBQSxNQUNYLFFBQVEsQ0FBQztBQUFBO0FBQUEsTUFDVCxRQUFRO0FBQUE7QUFBQSxNQUNSLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQTtBQUFBLFVBRU4sZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUE7QUFBQSxVQUVoQixnQkFBZ0IsQ0FBQyxjQUFjO0FBQzdCLGdCQUFJLFdBQVcsS0FBSyxVQUFVLFFBQVEsRUFBRSxHQUFHO0FBQ3pDLHFCQUFPO0FBQUEsWUFDVDtBQUNBLGdCQUFJLG1DQUFtQyxLQUFLLFVBQVUsUUFBUSxFQUFFLEdBQUc7QUFDakUscUJBQU87QUFBQSxZQUNUO0FBRUEsbUJBQU87QUFBQSxVQUNUO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxXQUFXO0FBQUEsTUFDWCxTQUFTO0FBQUEsUUFDUCxVQUFVO0FBQUEsVUFDUixlQUFlO0FBQUEsUUFDakI7QUFBQSxRQUNBLFFBQVE7QUFBQSxRQUNSLE9BQU87QUFBQSxRQUNQLGVBQWU7QUFBQSxVQUNiLE1BQU07QUFBQSxRQUNSO0FBQUEsTUFDRixDQUFDO0FBQUEsTUFDRCxjQUFjO0FBQUEsTUFDZCxXQUFXO0FBQUEsSUFDYjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sU0FBUztBQUFBO0FBQUEsUUFFUCxpQkFBaUI7QUFBQTtBQUFBLFFBRWpCLDBCQUEwQjtBQUFBLFFBQzFCLG1CQUFtQjtBQUFBLFFBQ25CLG9CQUFvQjtBQUFBLFFBQ3BCLG1CQUFtQjtBQUFBLFFBQ25CLHNCQUFzQjtBQUFBLFFBQ3RCLDJCQUEyQjtBQUFBLFVBQ3pCO0FBQUEsVUFDQTtBQUFBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNGLEVBQUUsS0FBSyxJQUFJO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVEsUUFDSjtBQUFBLE1BQ0UsT0FBTztBQUFBLFFBQ0wsU0FBUyxDQUFDLG1CQUFtQixTQUFTO0FBQUEsTUFDeEM7QUFBQSxNQUNBLElBQUk7QUFBQSxRQUNGLE9BQU8sQ0FBQyxJQUFJO0FBQUE7QUFBQSxNQUNkO0FBQUEsSUFDRixJQUNBO0FBQUEsRUFDTjtBQUNGLENBQUM7OztBRGhGRCxJQUFPQSx1QkFBUSxhQUFhLHFCQUFZLE1BQU07QUFDNUMsU0FBTztBQUFBLElBQ0wsT0FBTztBQUFBLE1BQ0wsS0FBSztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsZUFBZTtBQUFBLFFBQ2IsT0FBTyxDQUFDLHlCQUF5QixxQkFBcUI7QUFBQSxRQUN0RCxRQUFRO0FBQUEsVUFDTixnQkFBZ0I7QUFBQSxVQUNoQixnQkFBZ0I7QUFBQSxVQUNoQixnQkFBZ0I7QUFBQSxRQUNsQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxVQUFVLENBQUMsQ0FBQztBQUFBLEVBQ2xEO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsidml0ZV9jb25maWdfZGVmYXVsdCJdCn0K
