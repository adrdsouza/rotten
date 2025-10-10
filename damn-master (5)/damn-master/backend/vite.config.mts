import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { pathToFileURL, fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { resolve, join, dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    base: '/admin',
    build: {
        outDir: join(__dirname, 'dist/dashboard'),
    },
    plugins: [
        vendureDashboardPlugin({
            vendureConfigPath: pathToFileURL('./src/vendure-config.ts'),
            api: {
                // Use production domain - browser connects to this
                host: process.env.ADMIN_API_HOST || 'https://damneddesigns.com',
                port: undefined, // No port needed for HTTPS
            },
            gqlOutputPath: './src/gql',
        }),
    ],
    resolve: {
        alias: {
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
        },
    },
    server: {
        port: 5173,
        strictPort: false,
        host: true,
    },
    preview: {
        port: 5173,
        strictPort: false,
        host: true,
        allowedHosts: ['damneddesigns.com', 'localhost'],
    },
});