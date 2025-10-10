# Track Order Modal - Complete Implementation Guide

This document provides a comprehensive guide to implementing a Track Order Modal system with both backend and frontend components. The system allows customers to securely track their orders by providing their order code and email address.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│  GraphQL API    │───▶│ Backend Plugin  │
│  (Track Modal)  │    │   (Qwik Server) │    │ (Vendure Core)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
    Modal UI              Server Function        Order Tracking
   Components             with GraphQL           Service & Plugin
```

## 📋 Features

✅ **Secure Order Lookup** - Email verification for guest orders  
✅ **Rate Limiting** - Protection against brute force attempts  
✅ **Responsive Design** - Works on mobile and desktop  
✅ **Compact UI** - Clean, professional appearance  
✅ **Real-time Tracking** - Integration with fulfillment systems  
✅ **Error Handling** - User-friendly error messages  
✅ **Image Optimization** - Proper aspect ratios for product images  

---

## 🔧 Backend Implementation

### 1. Order Tracking Plugin

#### File: `backend/src/plugins/order-tracking/order-tracking.plugin.ts`

```typescript
import {
  VendurePlugin,
  PluginCommonModule,
  RequestContext,
  Logger,
} from '@vendure/core';
import { Injectable } from '@nestjs/common';
import { gql } from 'graphql-tag';

import { OrderTrackingService } from './services/order-tracking.service';
import { OrderTrackingResolver } from './resolvers/order-tracking.resolver';

/**
 * Order Tracking Plugin
 * 
 * This plugin provides secure order tracking functionality for guest customers
 * beyond Vendure's default 2-hour window. It allows customers to track their
 * orders by providing their order code and email address.
 * 
 * Features:
 * - Secure order lookup with email verification
 * - Rate limiting protection
 * - Comprehensive order details (status, items, tracking, shipping)
 * - Guest-friendly tracking without requiring authentication
 */
@VendurePlugin({
  compatibility: '^3.0.0',
  imports: [PluginCommonModule],
  providers: [OrderTrackingService],
  shopApiExtensions: {
    schema: gql`
      extend type Query {
        trackOrder(orderCode: String!, email: String!): OrderTrackingResult!
      }
      
      type OrderTrackingResult {
        order: Order
        error: String
        success: Boolean!
      }
    `,
    resolvers: [OrderTrackingResolver],
  },
})
export class OrderTrackingPlugin {
  private static readonly loggerCtx = 'OrderTrackingPlugin';

  static init(): typeof OrderTrackingPlugin {
    return OrderTrackingPlugin;
  }

  async onApplicationBootstrap() {
    Logger.info('OrderTrackingPlugin initialized successfully', OrderTrackingPlugin.loggerCtx);
  }

  async onApplicationShutdown() {
    Logger.info('OrderTrackingPlugin shutting down', OrderTrackingPlugin.loggerCtx);
  }
}
```

### 2. Order Tracking Service

#### File: `backend/src/plugins/order-tracking/services/order-tracking.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  RequestContext,
  OrderService,
  Order,
  TransactionalConnection,
  Logger,
} from '@vendure/core';

export interface OrderTrackingResult {
  order?: Order;
  error?: string;
  success: boolean;
}

@Injectable()
export class OrderTrackingService {
  private readonly trackingAttempts = new Map<string, number>();
  private readonly MAX_ATTEMPTS_PER_HOUR = 10;

  constructor(
    private orderService: OrderService,
    private connection: TransactionalConnection,
  ) {}

  /**
   * Track an order by order code and email address
   * Provides secure order lookup with email verification
   */
  async trackOrder(
    ctx: RequestContext,
    orderCode: string,
    email: string
  ): Promise<OrderTrackingResult> {
    try {
      // Rate limiting check
      const clientKey = this.getClientKey(ctx, email);
      if (this.isRateLimited(clientKey)) {
        Logger.warn(
          `Rate limit exceeded for order tracking: ${email}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Too many tracking attempts. Please try again later.',
        };
      }

      // Input validation
      if (!orderCode || !email) {
        return {
          success: false,
          error: 'Order code and email are required.',
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          error: 'Please provide a valid email address.',
        };
      }

      // Find the order by code with relations
      const order = await this.orderService.findOneByCode(ctx, orderCode, [
        'customer',
        'lines',
        'lines.productVariant',
        'lines.productVariant.product',
        'lines.featuredAsset',
        'fulfillments',
        'payments',
      ]);

      if (!order) {
        this.incrementAttempts(clientKey);
        Logger.warn(
          `Order not found: ${orderCode} for email: ${email}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Order not found. Please check your order number and email address.',
        };
      }

      // Verify email matches (check customer email)
      const orderEmail = order.customer?.emailAddress;
      if (!orderEmail || orderEmail.toLowerCase() !== email.toLowerCase()) {
        this.incrementAttempts(clientKey);
        Logger.warn(
          `Email mismatch for order ${orderCode}: provided ${email}, expected ${orderEmail}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Order not found. Please check your order number and email address.',
        };
      }

      // Success - reset rate limiting for this client
      this.resetAttempts(clientKey);
      
      Logger.info(
        `Successful order tracking: ${orderCode} for ${email}`,
        'OrderTrackingService'
      );

      return {
        success: true,
        order,
      };
    } catch (error) {
      Logger.error(
        `Error tracking order ${orderCode}: ${error instanceof Error ? error.message : error}`,
        'OrderTrackingService'
      );
      return {
        success: false,
        error: 'Unable to track order at this time. Please try again later.',
      };
    }
  }

  /**
   * Generate a client key for rate limiting
   */
  private getClientKey(ctx: RequestContext, email: string): string {
    const ip = ctx.req?.ip || 'unknown';
    const userAgent = ctx.req?.get('user-agent') || 'unknown';
    return `${ip}:${email}:${userAgent}`.substring(0, 100);
  }

  /**
   * Check if client is rate limited
   */
  private isRateLimited(clientKey: string): boolean {
    const attempts = this.trackingAttempts.get(clientKey) || 0;
    return attempts >= this.MAX_ATTEMPTS_PER_HOUR;
  }

  /**
   * Increment tracking attempts for a client
   */
  private incrementAttempts(clientKey: string): void {
    const current = this.trackingAttempts.get(clientKey) || 0;
    this.trackingAttempts.set(clientKey, current + 1);
    
    // Clean up old entries every 100 attempts
    if (this.trackingAttempts.size > 1000) {
      this.cleanupOldAttempts();
    }
  }

  /**
   * Reset tracking attempts for a client
   */
  private resetAttempts(clientKey: string): void {
    this.trackingAttempts.delete(clientKey);
  }

  /**
   * Clean up old tracking attempts (simple cleanup - in production use Redis with TTL)
   */
  private cleanupOldAttempts(): void {
    if (this.trackingAttempts.size > 500) {
      const keysToDelete = Array.from(this.trackingAttempts.keys()).slice(0, 250);
      keysToDelete.forEach(key => this.trackingAttempts.delete(key));
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### 3. GraphQL Resolver

#### File: `backend/src/plugins/order-tracking/resolvers/order-tracking.resolver.ts`

```typescript
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Logger } from '@vendure/core';
import { OrderTrackingService, OrderTrackingResult } from '../services/order-tracking.service';

@Resolver()
export class OrderTrackingResolver {
  constructor(private orderTrackingService: OrderTrackingService) {}

  @Query()
  async trackOrder(
    @Ctx() ctx: RequestContext,
    @Args('orderCode') orderCode: string,
    @Args('email') email: string
  ): Promise<OrderTrackingResult> {
    try {
      // Log the tracking attempt (without exposing sensitive data in logs)
      Logger.debug(
        `Order tracking attempt for order: ${orderCode}`,
        'OrderTrackingResolver'
      );

      const result = await this.orderTrackingService.trackOrder(ctx, orderCode, email);
      
      // Log successful result (without exposing order details in logs)
      if (result.success) {
        Logger.debug(
          `Successful order tracking for order: ${orderCode}`,
          'OrderTrackingResolver'
        );
      } else {
        Logger.debug(
          `Failed order tracking for order: ${orderCode} - ${result.error}`,
          'OrderTrackingResolver'
        );
      }

      return result;
    } catch (error) {
      Logger.error(
        `Error in trackOrder resolver: ${error instanceof Error ? error.message : error}`,
        'OrderTrackingResolver'
      );
      
      return {
        success: false,
        error: 'Unable to process tracking request at this time.',
      };
    }
  }
}
```

### 4. Plugin Index File

#### File: `backend/src/plugins/order-tracking/index.ts`

```typescript
export * from './order-tracking.plugin';
export * from './services/order-tracking.service';
export * from './resolvers/order-tracking.resolver';
```

### 5. Register Plugin in Vendure Config

#### File: `backend/src/vendure-config.ts`

```typescript
// Import the plugin
import { OrderTrackingPlugin } from './plugins/order-tracking';

// Add to plugins array
export const config: VendureConfig = {
  // ... other config
  plugins: [
    // ... other plugins
    OrderTrackingPlugin.init(),
    // ... other plugins
  ],
};
```

---

## 🎨 Frontend Implementation - Part 1

### 1. Track Order Service

#### File: `frontend/src/services/track-order.service.ts`

```typescript
import { server$ } from '@qwik.dev/router';
import { Order } from '~/generated/graphql';
import gql from 'graphql-tag';

export interface OrderTrackingResult {
  order?: Order;
  error?: string;
  success: boolean;
}

/**
 * Shared server function to track order via GraphQL
 */
export const trackOrderServer = server$(async (orderCode: string, email: string): Promise<OrderTrackingResult> => {
  try {
    const { requester } = await import('~/utils/api');
    const { trackOrder } = await requester<
      { trackOrder: OrderTrackingResult },
      { orderCode: string; email: string }
    >(
      gql`
        query trackOrder($orderCode: String!, $email: String!) {
          trackOrder(orderCode: $orderCode, email: $email) {
            success
            error
            order {
              id
              code
              state
              orderPlacedAt
              totalWithTax
              subTotalWithTax
              shippingWithTax
              currencyCode
              totalQuantity
              customer {
                id
                firstName
                lastName
                emailAddress
              }
              shippingAddress {
                fullName
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
                phoneNumber
              }
              lines {
                id
                quantity
                unitPriceWithTax
                linePriceWithTax
                productVariant {
                  id
                  name
                  sku
                  product {
                    name
                    slug
                  }
                }
                featuredAsset {
                  preview
                }
              }
              fulfillments {
                id
                state
                method
                trackingCode
                createdAt
                updatedAt
              }
              payments {
                id
                method
                amount
                state
                createdAt
              }
            }
          }
        }
      `,
      { orderCode, email }
    );
    return trackOrder;
  } catch (error) {
    console.error('Order tracking error:', error);
    return {
      success: false,
      error: 'Unable to track order at this time. Please try again later.',
    };
  }
});
```# Track Order Modal - Complete Implementation Guide

This document provides a comprehensive guide to implementing a Track Order Modal system with both backend and frontend components. The system allows customers to securely track their orders by providing their order code and email address.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│  GraphQL API    │───▶│ Backend Plugin  │
│  (Track Modal)  │    │   (Qwik Server) │    │ (Vendure Core)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
    Modal UI              Server Function        Order Tracking
   Components             with GraphQL           Service & Plugin
```

## 📋 Features

✅ **Secure Order Lookup** - Email verification for guest orders  
✅ **Rate Limiting** - Protection against brute force attempts  
✅ **Responsive Design** - Works on mobile and desktop  
✅ **Compact UI** - Clean, professional appearance  
✅ **Real-time Tracking** - Integration with fulfillment systems  
✅ **Error Handling** - User-friendly error messages  
✅ **Image Optimization** - Proper aspect ratios for product images  

---

## 🔧 Backend Implementation

### 1. Order Tracking Plugin

#### File: `backend/src/plugins/order-tracking/order-tracking.plugin.ts`

```typescript
import {
  VendurePlugin,
  PluginCommonModule,
  RequestContext,
  Logger,
} from '@vendure/core';
import { Injectable } from '@nestjs/common';
import { gql } from 'graphql-tag';

import { OrderTrackingService } from './services/order-tracking.service';
import { OrderTrackingResolver } from './resolvers/order-tracking.resolver';

/**
 * Order Tracking Plugin
 * 
 * This plugin provides secure order tracking functionality for guest customers
 * beyond Vendure's default 2-hour window. It allows customers to track their
 * orders by providing their order code and email address.
 * 
 * Features:
 * - Secure order lookup with email verification
 * - Rate limiting protection
 * - Comprehensive order details (status, items, tracking, shipping)
 * - Guest-friendly tracking without requiring authentication
 */
@VendurePlugin({
  compatibility: '^3.0.0',
  imports: [PluginCommonModule],
  providers: [OrderTrackingService],
  shopApiExtensions: {
    schema: gql`
      extend type Query {
        trackOrder(orderCode: String!, email: String!): OrderTrackingResult!
      }
      
      type OrderTrackingResult {
        order: Order
        error: String
        success: Boolean!
      }
    `,
    resolvers: [OrderTrackingResolver],
  },
})
export class OrderTrackingPlugin {
  private static readonly loggerCtx = 'OrderTrackingPlugin';

  static init(): typeof OrderTrackingPlugin {
    return OrderTrackingPlugin;
  }

  async onApplicationBootstrap() {
    Logger.info('OrderTrackingPlugin initialized successfully', OrderTrackingPlugin.loggerCtx);
  }

  async onApplicationShutdown() {
    Logger.info('OrderTrackingPlugin shutting down', OrderTrackingPlugin.loggerCtx);
  }
}
```

### 2. Order Tracking Service

#### File: `backend/src/plugins/order-tracking/services/order-tracking.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import {
  RequestContext,
  OrderService,
  Order,
  TransactionalConnection,
  Logger,
} from '@vendure/core';

export interface OrderTrackingResult {
  order?: Order;
  error?: string;
  success: boolean;
}

@Injectable()
export class OrderTrackingService {
  private readonly trackingAttempts = new Map<string, number>();
  private readonly MAX_ATTEMPTS_PER_HOUR = 10;

  constructor(
    private orderService: OrderService,
    private connection: TransactionalConnection,
  ) {}

  /**
   * Track an order by order code and email address
   * Provides secure order lookup with email verification
   */
  async trackOrder(
    ctx: RequestContext,
    orderCode: string,
    email: string
  ): Promise<OrderTrackingResult> {
    try {
      // Rate limiting check
      const clientKey = this.getClientKey(ctx, email);
      if (this.isRateLimited(clientKey)) {
        Logger.warn(
          `Rate limit exceeded for order tracking: ${email}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Too many tracking attempts. Please try again later.',
        };
      }

      // Input validation
      if (!orderCode || !email) {
        return {
          success: false,
          error: 'Order code and email are required.',
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          error: 'Please provide a valid email address.',
        };
      }

      // Find the order by code with relations
      const order = await this.orderService.findOneByCode(ctx, orderCode, [
        'customer',
        'lines',
        'lines.productVariant',
        'lines.productVariant.product',
        'lines.featuredAsset',
        'fulfillments',
        'payments',
      ]);

      if (!order) {
        this.incrementAttempts(clientKey);
        Logger.warn(
          `Order not found: ${orderCode} for email: ${email}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Order not found. Please check your order number and email address.',
        };
      }

      // Verify email matches (check customer email)
      const orderEmail = order.customer?.emailAddress;
      if (!orderEmail || orderEmail.toLowerCase() !== email.toLowerCase()) {
        this.incrementAttempts(clientKey);
        Logger.warn(
          `Email mismatch for order ${orderCode}: provided ${email}, expected ${orderEmail}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Order not found. Please check your order number and email address.',
        };
      }

      // Success - reset rate limiting for this client
      this.resetAttempts(clientKey);
      
      Logger.info(
        `Successful order tracking: ${orderCode} for ${email}`,
        'OrderTrackingService'
      );

      return {
        success: true,
        order,
      };
    } catch (error) {
      Logger.error(
        `Error tracking order ${orderCode}: ${error instanceof Error ? error.message : error}`,
        'OrderTrackingService'
      );
      return {
        success: false,
        error: 'Unable to track order at this time. Please try again later.',
      };
    }
  }

  /**
   * Generate a client key for rate limiting
   */
  private getClientKey(ctx: RequestContext, email: string): string {
    const ip = ctx.req?.ip || 'unknown';
    const userAgent = ctx.req?.get('user-agent') || 'unknown';
    return `${ip}:${email}:${userAgent}`.substring(0, 100);
  }

  /**
   * Check if client is rate limited
   */
  private isRateLimited(clientKey: string): boolean {
    const attempts = this.trackingAttempts.get(clientKey) || 0;
    return attempts >= this.MAX_ATTEMPTS_PER_HOUR;
  }

  /**
   * Increment tracking attempts for a client
   */
  private incrementAttempts(clientKey: string): void {
    const current = this.trackingAttempts.get(clientKey) || 0;
    this.trackingAttempts.set(clientKey, current + 1);
    
    // Clean up old entries every 100 attempts
    if (this.trackingAttempts.size > 1000) {
      this.cleanupOldAttempts();
    }
  }

  /**
   * Reset tracking attempts for a client
   */
  private resetAttempts(clientKey: string): void {
    this.trackingAttempts.delete(clientKey);
  }

  /**
   * Clean up old tracking attempts (simple cleanup - in production use Redis with TTL)
   */
  private cleanupOldAttempts(): void {
    if (this.trackingAttempts.size > 500) {
      const keysToDelete = Array.from(this.trackingAttempts.keys()).slice(0, 250);
      keysToDelete.forEach(key => this.trackingAttempts.delete(key));
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
```

### 3. GraphQL Resolver

#### File: `backend/src/plugins/order-tracking/resolvers/order-tracking.resolver.ts`

```typescript
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Logger } from '@vendure/core';
import { OrderTrackingService, OrderTrackingResult } from '../services/order-tracking.service';

@Resolver()
export class OrderTrackingResolver {
  constructor(private orderTrackingService: OrderTrackingService) {}

  @Query()
  async trackOrder(
    @Ctx() ctx: RequestContext,
    @Args('orderCode') orderCode: string,
    @Args('email') email: string
  ): Promise<OrderTrackingResult> {
    try {
      // Log the tracking attempt (without exposing sensitive data in logs)
      Logger.debug(
        `Order tracking attempt for order: ${orderCode}`,
        'OrderTrackingResolver'
      );

      const result = await this.orderTrackingService.trackOrder(ctx, orderCode, email);
      
      // Log successful result (without exposing order details in logs)
      if (result.success) {
        Logger.debug(
          `Successful order tracking for order: ${orderCode}`,
          'OrderTrackingResolver'
        );
      } else {
        Logger.debug(
          `Failed order tracking for order: ${orderCode} - ${result.error}`,
          'OrderTrackingResolver'
        );
      }

      return result;
    } catch (error) {
      Logger.error(
        `Error in trackOrder resolver: ${error instanceof Error ? error.message : error}`,
        'OrderTrackingResolver'
      );
      
      return {
        success: false,
        error: 'Unable to process tracking request at this time.',
      };
    }
  }
}
```

### 4. Plugin Index File

#### File: `backend/src/plugins/order-tracking/index.ts`

```typescript
export * from './order-tracking.plugin';
export * from './services/order-tracking.service';
export * from './resolvers/order-tracking.resolver';
```

### 5. Register Plugin in Vendure Config

#### File: `backend/src/vendure-config.ts`

```typescript
// Import the plugin
import { OrderTrackingPlugin } from './plugins/order-tracking';

// Add to plugins array
export const config: VendureConfig = {
  // ... other config
  plugins: [
    // ... other plugins
    OrderTrackingPlugin.init(),
    // ... other plugins
  ],
};
```

---

## 🎨 Frontend Implementation - Part 1

### 1. Track Order Service

#### File: `frontend/src/services/track-order.service.ts`

```typescript
import { server$ } from '@qwik.dev/router';
import { Order } from '~/generated/graphql';
import gql from 'graphql-tag';

export interface OrderTrackingResult {
  order?: Order;
  error?: string;
  success: boolean;
}

/**
 * Shared server function to track order via GraphQL
 */
export const trackOrderServer = server$(async (orderCode: string, email: string): Promise<OrderTrackingResult> => {
  try {
    const { requester } = await import('~/utils/api');
    const { trackOrder } = await requester<
      { trackOrder: OrderTrackingResult },
      { orderCode: string; email: string }
    >(
      gql`
        query trackOrder($orderCode: String!, $email: String!) {
          trackOrder(orderCode: $orderCode, email: $email) {
            success
            error
            order {
              id
              code
              state
              orderPlacedAt
              totalWithTax
              subTotalWithTax
              shippingWithTax
              currencyCode
              totalQuantity
              customer {
                id
                firstName
                lastName
                emailAddress
              }
              shippingAddress {
                fullName
                streetLine1
                streetLine2
                city
                province
                postalCode
                country
                phoneNumber
              }
              lines {
                id
                quantity
                unitPriceWithTax
                linePriceWithTax
                productVariant {
                  id
                  name
                  sku
                  product {
                    name
                    slug
                  }
                }
                featuredAsset {
                  preview
                }
              }
              fulfillments {
                id
                state
                method
                trackingCode
                createdAt
                updatedAt
              }
              payments {
                id
                method
                amount
                state
                createdAt
              }
            }
          }
        }
      `,
      { orderCode, email }
    );
    return trackOrder;
  } catch (error) {
    console.error('Order tracking error:', error);
    return {
      success: false,
      error: 'Unable to track order at this time. Please try again later.',
    };
  }
});
```