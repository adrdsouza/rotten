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
    EmailPlugin, 
    FileBasedTemplateLoader,
    emailVerificationHandler,
    passwordResetHandler,
    emailAddressChangeHandler
} from '@vendure/email-plugin';
import { AssetServerPlugin, PresetOnlyStrategy } from '@vendure/asset-server-plugin';
// AdminUiPlugin removed - using React Dashboard instead
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import { RedisCachePlugin, DefaultSchedulerPlugin } from '@vendure/core';
// import { HardenPlugin } from '@vendure/harden-plugin';
import { AuditPlugin } from './plugins/audit-plugin.js';
import { UnifiedOrderSecurityPlugin } from './plugins/unified-order-security.plugin.js';
import { OrderDeduplicationPlugin } from './plugins/order-deduplication.plugin.js';
import { CustomShippingPlugin } from './plugins/custom-shipping/src/index.js';
import { SezzlePaymentPlugin } from './sezzle-payment/index.js';
import { orderFulfillmentHandler } from './email-handlers/order-fulfillment-handler.js';
import { orderConfirmationHandler } from './email-handlers/order-confirmation-handler.js';
import { orderRefundHandler } from './email-handlers/order-refund-handler.js';
import 'dotenv/config';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { NmiPaymentPlugin } from './plugins/nmi-payment/index.js';
import { SequentialOrderCodeStrategy } from './config/sequential-order-code-strategy.js';
import { NewsletterPlugin } from './plugins/newsletter/newsletter.plugin.js';
// import { createSecurityMiddleware } from './middleware/security-middleware.js';
// import { SecurityPlugin } from './plugins/security-plugin.js';
import { StaleOrderCleanupPlugin } from './plugins/stale-order-cleanup.plugin.js';
import { CacheInvalidationPlugin } from './plugins/cache-invalidation.plugin.js';
import { LocalCartCouponPlugin } from './plugins/custom-coupon-validation/local-cart-coupon.plugin.js';
// import { FulfillmentIntegrationPlugin } from './plugins/fulfillment-integration/index.js';
// import { HealthMonitorService } from './services/health-monitor.service.js';
import { SeoPlugin } from './plugins/seo-plugin/index.js';
import { SheerIdPlugin } from './plugins/sheerid-plugin/index.js';
import { ExactStockDisplayStrategy } from './exact-stock-display-strategy.js';
import { OrderTrackingPlugin } from './plugins/order-tracking/order-tracking.plugin.js';
import { sanitizeGraphQLError } from './middleware/error-handler.middleware.js';

// Use relative path resolution that works in both dev and build contexts
const _getProjectRoot = () => {
    // Always resolve relative to the current working directory
    return path.resolve(process.cwd());
};

// For static paths, we need to account for the backend structure
const getStaticPath = (relativePath: string) => {
    return path.resolve(process.cwd(), 'static', relativePath);
};

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
                : ['https://damneddesigns.com/admin', "https://damneddesigns.com"],
            credentials: true,
        },
        // PCI Compliance: Sanitize GraphQL errors to prevent information disclosure
        apolloServerPlugins: [
            {
                async requestDidStart() {
                    return {
                        async willSendResponse({ response }: any) {
                            if (response?.errors) {
                                response.errors = response.errors.map((error: any) =>
                                    sanitizeGraphQLError(error)
                                );
                            }
                        },
                    };
                },
            },
        ],
        middleware: [
            {
                handler: (req: Request, res: Response, next: NextFunction) => {
                    req.app.set('trust proxy', ['127.0.0.1', '::1', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16']);
                    next();
                },
                route: '/',
                beforeListen: true,
            },
            // Serve favicon files from static directory
            {
                handler: (req: Request, res: Response, next: NextFunction) => {
                    if (req.path === '/favicon.png' || req.path === '/favicon.svg' || req.path === '/favicon-dark.svg' || req.path === '/favicon-light.svg') {
                        // For favicon.png, redirect to favicon.svg
                        if (req.path === '/favicon.png') {
                            res.redirect(301, '/favicon.svg');
                            return;
                        }
                        // For other favicon requests, serve from static directory
                        const faviconPath = path.join(process.cwd(), 'static', req.path);
                        res.sendFile(faviconPath, (err) => {
                            if (err) {
                                // If file not found, continue to next middleware
                                next();
                            }
                        });
                    } else {
                        next();
                    }
                },
                route: '/',
            },
            // { handler: createSecurityMiddleware(), route: '/' },
            ...(!IS_DEV ? [{
                handler: (req: Request, res: Response, next: NextFunction) => {
                    if (req.headers.cookie && req.headers.cookie.includes('__vendure_session')) {
                        const sessionMatch = req.headers.cookie.match(/__vendure_session=([^;]+)/);
                        if (sessionMatch) {
                            if (req.url?.includes('shop-api') && Math.random() < 0.01) {
                                console.log(`Session: ${sessionMatch[1].substring(0, 8)}... | IP: ${req.ip} | URL: ${req.url}`);
                            }
                        }
                    }
                    next();
                },
                route: '/',
            }] : []),
            // ...(IS_DEV ? [] : [
            //     {
            //         handler: rateLimit({
            //             windowMs: 1 * 60 * 1000,
            //             max: 600,
            //             standardHeaders: true,
            //             legacyHeaders: false,
            //             message: 'Too many requests, please try again later.',
            //             keyGenerator: (req) => {
            //                 const isOrderOperation = req.body?.query?.includes('addItemToOrder') || req.body?.query?.includes('adjustOrderLine');
            //                 const ipKey = ipKeyGenerator(req.ip || 'unknown');
            //                 return isOrderOperation ? `order:${ipKey}` : `general:${ipKey}`;
            //             },
            //             skip: (req) => req.headers['user-agent']?.includes('HealthMonitor') || req.url?.includes('health'),
            //         }),
            //         route: '/shop-api',
            //     },
            //     {
            //         handler: rateLimit({
            //             windowMs: 5 * 60 * 1000,
            //             max: 50,
            //             standardHeaders: true,
            //             legacyHeaders: false,
            //             message: 'Too many order operations, please slow down.',
            //             keyGenerator: (req) => `order-ops:${ipKeyGenerator(req.ip || 'unknown')}`,
            //             skip: (req) => {
            //                 const isOrderOperation = req.body?.query?.includes('addItemToOrder') || req.body?.query?.includes('adjustOrderLine') || req.body?.query?.includes('setOrderShippingAddress');
            //                 return !isOrderOperation;
            //             }
            //         }),
            //         route: '/shop-api',
            //     },
            //     {
            //         handler: rateLimit({
            //             windowMs: 15 * 60 * 1000,
            //             max: 15000,
            //             standardHeaders: true,
            //             legacyHeaders: false,
            //             message: 'Too many admin requests, please try again later.',
            //         }),
            //         route: '/admin-api',
            //     },
            // ]),
            {
                handler: helmet({
                    contentSecurityPolicy: {
                        directives: {
                            defaultSrc: ["'self'"],
                            styleSrc: ["'self'", "'unsafe-inline'"],
                            scriptSrc: ["'self'", "'unsafe-eval'", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/"],
                            frameSrc: ["'self'", "https://www.google.com/recaptcha/", "https://recaptcha.google.com/recaptcha/"],
                            imgSrc: ["'self'", "data:", "https:"],
                            connectSrc: ["'self'", "https://www.google.com/recaptcha/"],
                            fontSrc: ["'self'"],
                            objectSrc: ["'none'"],
                            frameAncestors: ["'none'"],
                            ...(IS_DEV ? { 'worker-src': ["'self' blob:"] } : {})
                        },
                    },
                    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
                    noSniff: true,
                    xssFilter: true,
                    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
                }),
                route: '/',
            },
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
            domain: IS_DEV ? 'localhost' : '.damneddesigns.com',
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        synchronize: false,
        // migrations: [path.join(getProjectRoot(), 'src/migrations/*.+(js|ts)')], // Temporarily disabled due to TypeORM ES module import issues
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        // SSL encryption: Only required for remote database connections
        // Local connections (localhost/127.0.0.1) don't need SSL encryption
        ssl: (() => {
            const isProduction = process.env.NODE_ENV === 'production';
            const isLocalHost = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';
            const sslEnabled = process.env.DB_SSL === 'true';

            if (isProduction && !isLocalHost) {
                return { rejectUnauthorized: true, ca: process.env.DB_CA_CERT };
            } else if (sslEnabled) {
                return { rejectUnauthorized: false, ca: process.env.DB_CA_CERT };
            }
            return false;
        })(),
        extra: {
            max: process.env.WORKER_MODE === 'true' ? 40 : 100,
            min: process.env.WORKER_MODE === 'true' ? 8 : 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            acquireTimeoutMillis: 60000,
            createTimeoutMillis: 30000,
            statement_timeout: 60000,
            query_timeout: 60000,
            destroyTimeoutMillis: 5000,
            reapIntervalMillis: 1000,
            createRetryIntervalMillis: 200,
            evictionRunIntervalMillis: 10000,
            softIdleTimeoutMillis: 20000,
        },
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    orderOptions: {
        orderCodeStrategy: new SequentialOrderCodeStrategy(),
        guestCheckoutStrategy: new DefaultGuestCheckoutStrategy({
            allowGuestCheckoutForRegisteredCustomers: true,
        }),
    },
    customFields: {
        Customer: [
            { name: 'sheerIdVerifications', type: 'text', public: false },
            {
                name: 'activeVerifications',
                type: 'string',
                list: true,
                public: true,
                defaultValue: [],
                options: [
                    { value: 'military' }, { value: 'first_responder' }, { value: 'teacher' },
                    { value: 'student' }, { value: 'medical' }, { value: 'senior' }
                ]
            },
            { name: 'verificationMetadata', type: 'text', public: true }
        ],
        ProductVariant: [
            {
                name: 'salePrice',
                type: 'int',
                label: [{ languageCode: LanguageCode.en, value: 'Sale Price (Original)' }],
                ui: { component: 'price-form-input' },
                public: true,
            },
            {
                name: 'preOrderPrice',
                type: 'int',
                label: [{ languageCode: LanguageCode.en, value: 'Pre-Order Price (Original)' }],
                ui: { component: 'price-form-input' },
                public: true,
            },
            {
                name: 'shipDate',
                type: 'string',
                label: [{ languageCode: LanguageCode.en, value: 'Ship Date' }],
                public: true,
            },
        ],
    },
    catalogOptions: {
        stockDisplayStrategy: new ExactStockDisplayStrategy(),
    },
    plugins: [
        OrderTrackingPlugin.init(),
        LocalCartCouponPlugin,
        UnifiedOrderSecurityPlugin.init(),
        OrderDeduplicationPlugin.init(),
        StaleOrderCleanupPlugin.init(),
        CacheInvalidationPlugin.init(),
        // SecurityPlugin.init({
        //     enableLogging: true,
        //     enableGraphQLProtection: true,
        //     minRecaptchaScore: IS_DEV ? 0.3 : 0.5
        // }),
        NewsletterPlugin,
        NmiPaymentPlugin, // Re-enabled - payment processing issues resolved
        SezzlePaymentPlugin,
        CustomShippingPlugin,
        SeoPlugin.init({
            siteDomain: IS_DEV ? 'http://localhost:4000' : 'https://damneddesigns.com',
            companyName: 'Damned Designs',
            companyDescription: 'Premium handcrafted knives, EDC tools, lanyard beads, and everyday carry accessories. Specializing in high-quality tactical gear, kitchen knives, fidget spinners, and custom metalwork.',
            contactEmail: process.env.GMAIL_USER || 'info@damneddesigns.com',
            socialMediaUrls: {
                facebook: 'https://facebook.com/damneddesigns',
                instagram: 'https://instagram.com/damneddesigns',
                twitter: 'https://twitter.com/damneddesigns'
            },
            localBusiness: {
                address: '169 Madison Ave STE 15182',
                city: 'New York',
                state: 'NY',
                zipCode: '10016',
                country: 'US',
                phone: '+1-555-DAMNED',
                hours: 'Monday-Friday: 9:00 AM - 6:00 PM'
            }
        }),
        SheerIdPlugin.init({
            clientId: process.env.SHEERID_CLIENT_ID || '',
            clientSecret: process.env.SHEERID_CLIENT_SECRET || '',
            webhookSecret: process.env.SHEERID_WEBHOOK_SECRET || 'default-secret'
        }),
        AuditPlugin,
        // HardenPlugin.init({
        //     maxQueryComplexity: 10000,
        //     apiMode: process.env.APP_ENV !== 'prod' ? 'dev' : 'prod',
        //     logComplexityScore: process.env.APP_ENV !== 'prod',
        // }),
        RedisCachePlugin.init({
            namespace: 'vendure-cache',
            maxItemSizeInBytes: 256_000,
            redisOptions: {
                host: process.env.REDIS_HOST || '127.0.0.1',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
                password: process.env.REDIS_PASSWORD,
                family: 4,
                keepAlive: 30000,
                maxRetriesPerRequest: 3,
                connectTimeout: 5000,
                commandTimeout: 3000,
                lazyConnect: true,
                enableAutoPipelining: true,
                tls: process.env.REDIS_HOST !== '127.0.0.1' && process.env.NODE_ENV === 'production' ? {
                    rejectUnauthorized: true,
                } : undefined,
                retryStrategy: (times: number) => {
                    const delay = Math.min(times * 50, 2000);
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
            assetUploadDir: '/home/vendure/damneddesigns/assets',
            assetUrlPrefix: process.env.ASSETS_URL || (IS_DEV ? 'http://localhost:3000/assets' : 'https://damneddesigns.com/assets/'),
            presets: [
                { name: 'tiny', width: 50, height: 50, mode: 'crop' },
                { name: 'thumb', width: 150, height: 150, mode: 'crop' },
                { name: 'small', width: 300, height: 300, mode: 'resize' },
                { name: 'medium', width: 500, height: 500, mode: 'resize' },
                { name: 'large', width: 800, height: 800, mode: 'resize' },
                { name: 'xl', width: 1200, height: 1200, mode: 'resize' },
                { name: 'xxl', width: 1600, height: 1600, mode: 'resize' },
                { name: 'modal', width: 1600, height: 2000, mode: 'resize' },
                { name: 'ultra', width: 2048, height: 2048, mode: 'resize' },
                { name: '4k', width: 2560, height: 2560, mode: 'resize' },
            ],
            imageTransformStrategy: new PresetOnlyStrategy({
                defaultPreset: 'medium',
                permittedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
            }),
        }),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: !IS_DEV }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        IS_DEV
            ? EmailPlugin.init({
                devMode: true,
                outputPath: getStaticPath('email/test-emails'),
                route: 'mailbox',
                handlers: [
                    orderConfirmationHandler,
                    emailVerificationHandler,
                    passwordResetHandler,
                    emailAddressChangeHandler,
                    orderFulfillmentHandler,
                    orderRefundHandler
                ],
                templateLoader: new FileBasedTemplateLoader(getStaticPath('email/templates')),
                globalTemplateVars: {
                    fromAddress: `"${process.env.STORE_NAME || 'Damned Designs'}" <${process.env.GMAIL_USER}>`,
                    verifyEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://damneddesigns.com'}/verify`,
                    passwordResetUrl: `${process.env.STOREFRONT_URL || 'https://damneddesigns.com'}/password-reset`,
                    changeEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://damneddesigns.com'}/verify-email-address-change`
                },
            })
            : EmailPlugin.init({
                outputPath: getStaticPath('email/test-emails'),
                route: 'mailbox',
                handlers: [
                    orderConfirmationHandler,
                    emailVerificationHandler,
                    passwordResetHandler,
                    emailAddressChangeHandler,
                    orderFulfillmentHandler,
                    orderRefundHandler
                ],
                templateLoader: new FileBasedTemplateLoader(getStaticPath('email/templates')),
                transport: {
                    type: 'smtp',
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: process.env.GMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                    },
                },
                globalTemplateVars: {
                    fromAddress: `"${process.env.STORE_NAME || 'Damned Designs'}" <${process.env.GMAIL_USER}>`,
                    verifyEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://damneddesigns.com'}/verify`,
                    passwordResetUrl: `${process.env.STOREFRONT_URL || 'https://damneddesigns.com'}/password-reset`,
                    changeEmailAddressUrl: `${process.env.STOREFRONT_URL || 'https://damneddesigns.com'}/verify-email-address-change`
                },
            }),
        // AdminUiPlugin removed - using React Dashboard instead
        ...(IS_DEV ? [GraphiqlPlugin.init()] : []),
        DefaultSchedulerPlugin.init(),
    ],
};