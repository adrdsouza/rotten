import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
    AutoIncrementIdStrategy,
    LanguageCode,
    DefaultGuestCheckoutStrategy
} from '@vendure/core';
import { 
    defaultEmailHandlers, 
    EmailPlugin, 
    FileBasedTemplateLoader,
    emailVerificationHandler,
    passwordResetHandler,
    emailAddressChangeHandler
} from '@vendure/email-plugin';
import { AssetServerPlugin, PresetOnlyStrategy } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { RedisCachePlugin, DefaultSchedulerPlugin } from '@vendure/core';
// import { HardenPlugin } from '@vendure/harden-plugin'; // DISABLED
import { AuditPlugin } from './plugins/audit-plugin';
// import { UnifiedOrderSecurityPlugin } from './plugins/unified-order-security.plugin'; // DISABLED
// import { OrderDeduplicationPlugin } from './plugins/order-deduplication.plugin'; // DISABLED


import { CustomShippingPlugin } from './plugins/custom-shipping';
import { StripePlugin } from '@vendure/payments-plugin/package/stripe';
import { StripeExtensionPlugin } from './plugins/stripe-extension';
import { StripePreOrderPlugin, stripePreOrderPaymentHandler } from './plugins/stripe-pre-order';
// REMOVED: SezzlePaymentPlugin - not available for this clothing brand
import { orderFulfillmentHandler } from './email-handlers/order-fulfillment-handler';
import { orderConfirmationHandler } from './email-handlers/order-confirmation-handler';
import 'dotenv/config';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
// import helmet from 'helmet'; // DISABLED
// import rateLimit, { ipKeyGenerator } from 'express-rate-limit'; // DISABLED
// REMOVED: NmiPaymentPlugin - not available for this clothing brand
import { SequentialOrderCodeStrategy } from './config/sequential-order-code-strategy';
import { NewsletterPlugin } from './plugins/newsletter';
// import { createSecurityMiddleware } from './middleware/security-middleware'; // DISABLED
// import { SecurityPlugin } from './plugins/security-plugin'; // DISABLED
import { StaleOrderCleanupPlugin } from './plugins/stale-order-cleanup.plugin';
import { CacheInvalidationPlugin } from './plugins/cache-invalidation.plugin';
import { LocalCartCouponPlugin } from './plugins/custom-coupon-validation/local-cart-coupon.plugin';
// import { FulfillmentIntegrationPlugin } from './plugins/fulfillment-integration';
import { HealthMonitorService } from './services/health-monitor.service';
import { SeoPlugin } from './plugins/seo';

function validateEnvironment() {
    const required: Record<string, 'string' | 'number' | 'boolean'> = {
        'DB_NAME': 'string',
        'DB_HOST': 'string',
        'DB_PORT': 'number',
        'DB_USERNAME': 'string',
        'DB_PASSWORD': 'string',
        'SUPERADMIN_USERNAME': 'string',
        'COOKIE_SECRET': 'string',
        'GMAIL_USER': 'string',
    };

    for (const [key, type] of Object.entries(required)) {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Missing required environment variable: ${key}`);
        }
        if (type === 'number' && isNaN(Number(value))) {
            throw new Error(`Environment variable ${key} must be a number`);
        }
    }
}

validateEnvironment();

const IS_DEV = process.env.APP_ENV !== 'prod';
const serverPort = +process.env.PORT || 3000;

import { ExactStockDisplayStrategy } from './exact-stock-display-strategy';

export const config: VendureConfig = {
    entityOptions: {
        entityIdStrategy: new AutoIncrementIdStrategy(),
    },
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        cors: {
            origin: IS_DEV
                ? ["http://localhost:3000", "http://localhost:4000", "http://localhost:8080"]
                : ['https://rottenhand.com/admin', "https://rottenhand.com"],
            credentials: true,
        },
        middleware: [
            {
                handler: (req: Request, res: Response, next: NextFunction) => {
                    req.app.set('trust proxy', ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);
                    next();
                },
                route: '/',
                beforeListen: true,
            },
            // Security middleware for all routes - DISABLED
            // {
            //     handler: createSecurityMiddleware(),
            //     route: '/',
            // },
            // Session monitoring middleware (only in production)
            ...(!IS_DEV ? [{
                handler: (req: Request, res: Response, next: NextFunction) => {
                    // Log session info for debugging cart issues
                    if (req.headers.cookie && req.headers.cookie.includes('__vendure_session')) {
                        const sessionMatch = req.headers.cookie.match(/__vendure_session=([^;]+)/);
                        if (sessionMatch) {
                            // Only log for GraphQL requests to avoid spam
                            if (req.url?.includes('shop-api') && Math.random() < 0.01) { // 1% sampling
                                console.log(`Session: ${sessionMatch[1].substring(0, 8)}... | IP: ${req.ip} | URL: ${req.url}`);
                            }
                        }
                    }
                    next();
                },
                route: '/',
            }] : []),
            // Rate limiting - DISABLED
            // ...(IS_DEV ? [] : [
            //     // Tiered rate limiting for different endpoints
            //     {
            //         handler: rateLimit({
            //             windowMs: 1 * 60 * 1000, // 1 minute window
            //             max: 600, // Increased from 300 for high traffic
            //             standardHeaders: true,
            //             legacyHeaders: false,
            //             message: 'Too many requests, please try again later.',
            //             keyGenerator: (req) => {
            //                 // Different limits for different operations
            //                 const isOrderOperation = req.body?.query?.includes('addItemToOrder') ||
            //                                        req.body?.query?.includes('adjustOrderLine');
            //                 const ipKey = ipKeyGenerator(req.ip || 'unknown');
            //                 return isOrderOperation ? `order:${ipKey}` : `general:${ipKey}`;
            //             },
            //             skip: (req) => {
            //                 // Skip rate limiting for health checks
            //                 return req.headers['user-agent']?.includes('HealthMonitor') ||
            //                        req.url?.includes('health');
            //             }
            //         }),
            //         route: '/shop-api',
            //     },
            //     // Separate rate limit for order operations (more restrictive)
            //     {
            //         handler: rateLimit({
            //             windowMs: 5 * 60 * 1000, // 5 minute window
            //             max: 50, // Max 50 order operations per 5 minutes per IP
            //             standardHeaders: true,
            //             legacyHeaders: false,
            //             message: 'Too many order operations, please slow down.',
            //             keyGenerator: (req) => `order-ops:${ipKeyGenerator(req.ip || 'unknown')}`,
            //             skip: (req) => {
            //                 const isOrderOperation = req.body?.query?.includes('addItemToOrder') ||
            //                                        req.body?.query?.includes('adjustOrderLine') ||
            //                                        req.body?.query?.includes('setOrderShippingAddress');
            //                 return !isOrderOperation;
            //             }
            //         }),
            //         route: '/shop-api',
            //     },
            //     {
            //         handler: rateLimit({
            //             windowMs: 15 * 60 * 1000,
            //             max: 15000, // Increased from 10000 for high admin usage
            //             standardHeaders: true,
            //             legacyHeaders: false,
            //             message: 'Too many admin requests, please try again later.',
            //         }),
            //         route: '/admin-api',
            //     },
            // ]),
            // Helmet security headers - DISABLED
            // {
            //     handler: helmet({
            //         contentSecurityPolicy: {
            //             directives: {
            //                 defaultSrc: ["'self'"],
            //                 styleSrc: ["'self'", "'unsafe-inline'"],
            //                 scriptSrc: [
            //                     "'self'",
            //                     "'unsafe-eval'",  // Allow in both dev and prod for translation functionality
            //                     "https://www.google.com/recaptcha/",
            //                     "https://www.gstatic.com/recaptcha/"
            //                 ],
            //                 frameSrc: [
            //                     "'self'",
            //                     "https://www.google.com/recaptcha/",
            //                     "https://recaptcha.google.com/recaptcha/"
            //                 ],
            //                 imgSrc: ["'self'", "data:", "https:"],
            //                 connectSrc: ["'self'", "https://www.google.com/recaptcha/"],
            //                 fontSrc: ["'self'"],
            //                 objectSrc: ["'none'"],
            //                 frameAncestors: ["'none'"],
            //                 ...(IS_DEV ? { 'worker-src': ["'self' blob:"] } : {})
            //             },
            //         },
            //         hsts: {
            //             maxAge: 31536000,
            //             includeSubDomains: true,
            //             preload: true
            //         },
            //         noSniff: true,
            //         xssFilter: true,
            //         referrerPolicy: { policy: "strict-origin-when-cross-origin" }
            //     }),
            //     route: '/',
            // },
        ],
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: "",
        },
        cookieOptions: {
            name: '__vendure_session',
            secret: process.env.COOKIE_SECRET,
            httpOnly: true,
            secure: !IS_DEV,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000,
            // Domain configuration for proper cookie sharing
            domain: IS_DEV ? 'localhost' : '.rottenhand.com',
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
            ca: process.env.DB_CA_CERT,
        } : false,
        extra: {
            // OPTIMIZED: 90% capacity utilization with 10% safety margin
            // Total connections = 1 admin × 100 + 2 workers × 40 = 180 connections (90% of 200)
            max: process.env.WORKER_MODE === 'true' ? 40 : 100, // Workers get 40, admin gets 100
            min: process.env.WORKER_MODE === 'true' ? 8 : 20,   // Higher minimums for better performance
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000, // Increased timeout for high load
            acquireTimeoutMillis: 60000, // How long to wait for a connection
            createTimeoutMillis: 30000, // How long to wait to create a connection
            statement_timeout: 60000,
            query_timeout: 60000,
            // Connection pool optimization
            destroyTimeoutMillis: 5000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200,
            // Additional connection management
            evictionRunIntervalMillis: 10000, // Check for idle connections every 10s
            softIdleTimeoutMillis: 20000, // Soft timeout for idle connections
        },
    },
    paymentOptions: {
        paymentMethodHandlers: [
            dummyPaymentHandler,
            stripePreOrderPaymentHandler,
            // Stripe handler is automatically added by StripePlugin
        ],
    },
    orderOptions: {
        orderCodeStrategy: new SequentialOrderCodeStrategy(),
        guestCheckoutStrategy: new DefaultGuestCheckoutStrategy({
            allowGuestCheckoutForRegisteredCustomers: true,
        }),
    },
    customFields: {},
    catalogOptions: {
        stockDisplayStrategy: new ExactStockDisplayStrategy(),
    },
    plugins: [
        SeoPlugin.init({
            siteDomain: 'https://rottenhand.com',
            companyName: 'Rotten Hand',
            companyDescription: 'Premium quality products and exceptional service at Rotten Hand',
            contactEmail: 'info@rottenhand.com',
            socialMediaUrls: {
                // Add social media URLs when available
            },
            localBusiness: {
                address: '123 Commerce Street',
                city: 'Business City',
                state: 'State',
                zipCode: '12345',
                country: 'US',
                phone: '+1-XXX-XXX-XXXX',
                hours: 'Mon-Fri 9AM-6PM EST',
            },
        }), // 🔍 SEO plugin for JSON-LD schemas and sitemaps
        LocalCartCouponPlugin, // 🎫 Local cart coupon validation
        // UnifiedOrderSecurityPlugin.init(), // 🚀 UNIFIED - comprehensive logging + security - DISABLED
        // OrderDeduplicationPlugin.init(), // 🔒 Prevent duplicate orders during high traffic - DISABLED

        StaleOrderCleanupPlugin.init(),
        CacheInvalidationPlugin.init(),
        // SecurityPlugin.init({
        //     enableLogging: true,
        //     enableGraphQLProtection: true,
        //     minRecaptchaScore: IS_DEV ? 0.3 : 0.5
        // }), // DISABLED
        NewsletterPlugin,
        // StripePlugin.init({
        //     // This prevents different customers from using the same PaymentIntent
        //     storeCustomersInStripe: true,
        //     // Add payment method information to Stripe metadata for webhook processing
        //     metadata: async (injector, ctx, order) => {
        //         return {
        //             vendure_order_code: order.code,
        //             vendure_order_id: order.id.toString(),
        //             vendure_customer_email: order.customer?.emailAddress || 'guest'
        //         };
        //     },
        // }),
        StripePreOrderPlugin, // 🚀 Stripe pre-order: PaymentIntent creation before order creation
        StripeExtensionPlugin, // 💳 Stripe extensions: payment method capture + refund webhooks
        // REMOVED: NmiPaymentPlugin - not available for this clothing brand
        // REMOVED: SezzlePaymentPlugin - not available for this clothing brand
        CustomShippingPlugin,
        // Fulfillment Integration Plugin - Disabled until credentials are obtained
        // Uncomment and configure when you have VeraCore API credentials:
        // FulfillmentIntegrationPlugin.init({
        //     apiUrl: process.env.VERACORE_API_URL || 'https://api.veracore.com/v1',
        //     clientId: process.env.VERACORE_CLIENT_ID!,
        //     clientSecret: process.env.VERACORE_CLIENT_SECRET!,
        //     companyId: process.env.VERACORE_COMPANY_ID!,
        //     syncInventoryIntervalMinutes: 1440,  // Daily (24 hours)
        //     syncTrackingIntervalMinutes: 30,     // Every 30 min during LA business hours (9 AM-7 PM, Mon-Fri)
        //     orderSyncTriggerStates: ['PaymentSettled'],
        // }),
        AuditPlugin,
        // HardenPlugin.init({
        //     maxQueryComplexity: 5000, // Reduced from 10000 for better control
        //     apiMode: process.env.APP_ENV !== 'prod' ? 'dev' : 'prod',
        //     logComplexityScore: process.env.APP_ENV !== 'prod',
        // }), // DISABLED
        RedisCachePlugin.init({
            namespace: 'vendure-cache',
            maxItemSizeInBytes: 512_000, // Increased for batched product queries
            redisOptions: {
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                password: process.env.REDIS_PASSWORD,
                // High-concurrency Redis optimization
                family: 4, // Force IPv4
                keepAlive: 30000, // Keep alive timeout in ms
                maxRetriesPerRequest: 3,
                connectTimeout: 5000,
                commandTimeout: 3000,
                lazyConnect: true, // Connect only when needed
                // Connection pool for high concurrency
                enableAutoPipelining: true, // Batch commands for better performance
                // Disable TLS for local Redis connections
                tls: process.env.REDIS_HOST !== '127.0.0.1' && process.env.NODE_ENV === 'production' ? {
                    rejectUnauthorized: true,
                } : undefined,
                retryStrategy: (times: number) => {
                    const delay = Math.min(times * 50, 2000); // Faster retry
                    return delay;
                },
                reconnectOnError: (err: Error) => {
                    console.error('Redis connection error:', err.message);
                    return err.message.includes('READONLY') || err.message.includes('ECONNRESET');
                }
            }
        }),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: '/home/vendure/rottenhand/assets',
            assetUrlPrefix: process.env.ASSETS_URL || (IS_DEV ? 'http://localhost:3000/assets' : 'https://rottenhand.com/assets/'),
            presets: [
                // Default Vendure presets
                { name: 'tiny', width: 50, height: 50, mode: 'crop' },
                { name: 'thumb', width: 150, height: 150, mode: 'crop' },
                { name: 'small', width: 300, height: 300, mode: 'resize' },
                { name: 'medium', width: 500, height: 500, mode: 'resize' },
                { name: 'large', width: 800, height: 800, mode: 'resize' },
                // Custom high-resolution presets for product images
                { name: 'xl', width: 1200, height: 1200, mode: 'resize' },
                { name: 'xxl', width: 1600, height: 1600, mode: 'resize' },
                { name: 'modal', width: 1600, height: 2000, mode: 'resize' },
                // Ultra high-resolution presets for large monitors
                { name: 'ultra', width: 2048, height: 2048, mode: 'resize' },
                { name: '4k', width: 2560, height: 2560, mode: 'resize' },
            ],
            imageTransformStrategy: new PresetOnlyStrategy({
                defaultPreset: 'medium',
                permittedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'], // Enable AVIF support
            }),
        }),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: !IS_DEV }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        IS_DEV
            ? EmailPlugin.init({
                devMode: true,
                outputPath: path.join(__dirname, '../static/email/test-emails'),
                route: 'mailbox',
                handlers: [
                    orderConfirmationHandler,  // Our custom order confirmation handler
                    emailVerificationHandler,  // Default handlers excluding order confirmation
                    passwordResetHandler,
                    emailAddressChangeHandler,
                    orderFulfillmentHandler    // Our custom fulfillment handler
                ],
                templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
                globalTemplateVars: {
                    fromAddress: `\"${process.env.STORE_NAME || 'Rotten Hand'}\" <${process.env.FROM_EMAIL || process.env.GMAIL_USER}>`,
                    verifyEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://rottenhand.com'}/verify`,
                    passwordResetUrl: `${process.env.STOREFRONT_URL || 'https://rottenhand.com'}/password-reset`,
                    changeEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://rottenhand.com'}/verify-email-address-change`
                },
            })
            : EmailPlugin.init({
                outputPath: path.join(__dirname, '../static/email/test-emails'),
                route: 'mailbox',
                handlers: [
                    orderConfirmationHandler,  // Our custom order confirmation handler
                    emailVerificationHandler,  // Default handlers excluding order confirmation
                    passwordResetHandler,
                    emailAddressChangeHandler,
                    orderFulfillmentHandler    // Our custom fulfillment handler
                ],
                templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
                        transport: {
                type: 'smtp',
                host: 'smtp.gmail.com',
                port: 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            },
                globalTemplateVars: {
                    fromAddress: `\"${process.env.STORE_NAME || 'Rotten Hand'}\" <${process.env.FROM_EMAIL || process.env.GMAIL_USER}>`,
                    verifyEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://rottenhand.com'}/verify`,
                    passwordResetUrl: `${process.env.STOREFRONT_URL || 'https://rottenhand.com'}/password-reset`,
                    changeEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://rottenhand.com'}/verify-email-address-change`
                },
            }),
        AdminUiPlugin.init({
            route: 'admin',
            port: serverPort,
            adminUiConfig: {
                adminApiPath: 'admin-api',
                brand: process.env.STORE_NAME || 'Rotten Hand',
                hideVendureBranding: true,
                defaultLanguage: LanguageCode.en,
                availableLanguages: [LanguageCode.en],
                loginImageUrl: 'https://rottenhand.com/assets/preview/91/mascot__preview.png?preset=large',
            },
        }),
        ...(IS_DEV ? [GraphiqlPlugin.init()] : []),
        DefaultSchedulerPlugin.init(),
    ],
};