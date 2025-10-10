import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { getRedisConnection } from './redis-connection-pool.js';

export interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessful?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  onLimitReached?: (req: Request, res: Response) => void;
}

export interface RateLimitInfo {
  totalRequests: number;
  remainingRequests: number;
  resetTime: Date;
  limited: boolean;
}

/**
 * Redis-based sliding window rate limiter
 */
export class RedisRateLimiter {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, prefix = 'rate_limit:') {
    this.redis = redis;
    this.prefix = prefix;
  }

  /**
   * Check if request is within rate limit
   */
  async checkRateLimit(
    key: string,
    windowMs: number,
    maxRequests: number
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `${this.prefix}${key}`;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove old entries outside the window
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      
      // Count current requests in window
      pipeline.zcard(redisKey);
      
      // Add current request
      pipeline.zadd(redisKey, now, `${now}-${Math.random()}`);
      
      // Set expiry for cleanup
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
      
      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline failed');
      }

      const currentCount = (results[1][1] as number) || 0;
      const limited = currentCount >= maxRequests;
      
      // If limited, remove the request we just added
      if (limited) {
        await this.redis.zpopmax(redisKey);
      }

      return {
        totalRequests: currentCount + (limited ? 0 : 1),
        remainingRequests: Math.max(0, maxRequests - currentCount - (limited ? 0 : 1)),
        resetTime: new Date(now + windowMs),
        limited
      };

    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open in case of Redis issues
      return {
        totalRequests: 0,
        remainingRequests: maxRequests,
        resetTime: new Date(now + windowMs),
        limited: false
      };
    }
  }

  /**
   * Create Express middleware for rate limiting
   */
  createMiddleware(options: RateLimitOptions) {
    const {
      windowMs,
      maxRequests,
      keyGenerator = (req) => req.ip || 'unknown',
      message = 'Too many requests, please try again later.',
      onLimitReached
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = keyGenerator(req);
        const rateLimitInfo = await this.checkRateLimit(key, windowMs, maxRequests);

        // Set rate limit headers
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': rateLimitInfo.remainingRequests.toString(),
          'X-RateLimit-Reset': Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString(),
          'X-RateLimit-Window': Math.ceil(windowMs / 1000).toString()
        });

        if (rateLimitInfo.limited) {
          // Set Retry-After header
          res.set('Retry-After', Math.ceil(windowMs / 1000).toString());

          if (onLimitReached) {
            onLimitReached(req, res);
          }

          return res.status(429).json({
            error: 'rate_limit_exceeded',
            message,
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiting middleware error:', error);
        // Continue without rate limiting in case of errors
        next();
      }
    };
  }

  /**
   * Reset rate limit for a specific key (useful for testing or admin overrides)
   */
  async resetRateLimit(key: string): Promise<void> {
    try {
      await this.redis.del(`${this.prefix}${key}`);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getRateLimitStatus(key: string, windowMs: number, maxRequests: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const redisKey = `${this.prefix}${key}`;

    try {
      // Clean up old entries and count current ones
      await this.redis.zremrangebyscore(redisKey, 0, windowStart);
      const currentCount = await this.redis.zcard(redisKey);

      return {
        totalRequests: currentCount,
        remainingRequests: Math.max(0, maxRequests - currentCount),
        resetTime: new Date(now + windowMs),
        limited: currentCount >= maxRequests
      };
    } catch (error) {
      console.error('Failed to get rate limit status:', error);
      return {
        totalRequests: 0,
        remainingRequests: maxRequests,
        resetTime: new Date(now + windowMs),
        limited: false
      };
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export function createCommonRateLimiters(redis: Redis) {
  const rateLimiter = new RedisRateLimiter(redis, 'vendure_security:');

  return {
    // General API rate limiting
    api: rateLimiter.createMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many API requests, please try again later.'
    }),

    // Checkout operations (more restrictive)
    checkout: rateLimiter.createMiddleware({
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 10,
      keyGenerator: (req) => `checkout:${req.ip}`,
      message: 'Too many checkout attempts, please try again in a few minutes.'
    }),

    // Authentication attempts
    auth: rateLimiter.createMiddleware({
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
      keyGenerator: (req) => `auth:${req.ip}`,
      message: 'Too many login attempts, please try again later.'
    }),

    // Contact form submissions
    contact: rateLimiter.createMiddleware({
      windowMs: 10 * 60 * 1000, // 10 minutes
      maxRequests: 3,
      keyGenerator: (req) => `contact:${req.ip}`,
      message: 'Too many contact form submissions, please try again later.'
    }),

    // Admin operations (higher limits but still protected)
    admin: rateLimiter.createMiddleware({
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 300,
      keyGenerator: (req) => `admin:${req.ip}`,
      message: 'Too many admin requests, please try again later.'
    })
  };
}

/**
 * Initialize Redis connection for rate limiting using shared pool
 */
export function initializeRedis(): Redis {
  return getRedisConnection('rate-limiter');
}

/**
 * Helper function for GraphQL security middleware
 * Check if a request is within rate limits
 */
export async function isValidRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const redis = initializeRedis();
    const rateLimiter = new RedisRateLimiter(redis, 'graphql_security:');
    
    const result = await rateLimiter.checkRateLimit(key, windowMs, maxRequests);
    
    return {
      allowed: !result.limited,
      remaining: result.remainingRequests,
      resetTime: result.resetTime.getTime()
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open in case of Redis issues
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime: Date.now() + windowMs
    };
  }
}
