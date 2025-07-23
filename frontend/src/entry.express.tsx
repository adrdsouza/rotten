import qwikRouterConfig from"@qwik-router-config";
import {
 createQwikRouter,
 type PlatformNode,
} from"@qwik.dev/router/middleware/node";
import"dotenv/config";
import express from"express";
import { join } from"node:path";
import { fileURLToPath } from"node:url";
import render from"./entry.ssr";

declare global {
 interface QwikRouterPlatform extends PlatformNode {}
}

// Directories where the static assets are located
const distDir = join(fileURLToPath(import.meta.url),"..","..","dist");
const buildDir = join(distDir,"build");
const assetsDir = join(distDir,"assets");

// Allow for dynamic port and host
const PORT = parseInt(process.env.PORT ?? '4000', 10);
const HOST = process.env.HOST ?? 'localhost';

// Create the Qwik Router Node middleware
const { router, notFound } = createQwikRouter({
 render,
 qwikRouterConfig,
});

// Create the express server
const app = express();

// Static asset handlers
app.use(`/build`, express.static(buildDir, { immutable: true, maxAge:"1y" }));
app.use(`/assets`, express.static(assetsDir, { immutable: true, maxAge:"1y" }));
// Add specific handler for fonts
app.use('/fonts', express.static(join(distDir, 'fonts'), { immutable: true, maxAge:"1y" }));
// Root static assets with custom cache control
app.use(express.static(distDir, {
  redirect: false,
  setHeaders: (res, path) => {
    const fileName = path.split('/').pop() || '';
    // For q-manifest.json and service workers, never cache.
    if (fileName === 'q-manifest.json' || (fileName.endsWith('.js') && !path.includes('/build/'))) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  },
}));

// Use Qwik Router's page and endpoint request handler
app.use(router);

// Use Qwik Router's 404 handler
app.use(notFound);

// Start the express server
app.listen(PORT, HOST, () => {
 console.log(`Server started: http://${HOST}:${PORT}/`);
});