import { Redis } from 'ioredis';
import { Logger } from '@vendure/core';

/**
 * Centralized Redis Connection Pool
 * Provides shared Redis connections to prevent connection exhaustion
 * and ensure consistent configuration across all plugins
 */
export class RedisConnectionPool {
  private static instance: RedisConnectionPool;
  private connections: Map<string, Redis> = new Map();
  private readonly loggerCtx = 'RedisConnectionPool';

  private constructor() {}

  static getInstance(): RedisConnectionPool {
    if (!RedisConnectionPool.instance) {
      RedisConnectionPool.instance = new RedisConnectionPool();
    }
    return RedisConnectionPool.instance;
  }

  /**
   * Get or create a Redis connection for a specific namespace
   */
  getConnection(namespace: string = 'default'): Redis {
    if (this.connections.has(namespace)) {
      const connection = this.connections.get(namespace)!;
      if (connection.status === 'ready' || connection.status === 'connecting') {
        return connection;
      }
    }

    // Create new connection with optimized settings
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      
      // Optimized connection settings
      family: 4, // Force IPv4
      keepAlive: 30000, // Keep alive timeout in ms
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: true, // Connect only when needed
      
      // Performance optimizations
      enableAutoPipelining: true, // Batch commands for better performance
      
      // Connection pool settings
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000); // Faster retry
        return delay;
      },
      
      reconnectOnError: (err: Error) => {
        Logger.error(`Redis reconnect error for ${namespace}: ${err.message}`, this.loggerCtx);
        return err.message.includes('READONLY') || err.message.includes('ECONNRESET');
      },

      // TLS configuration for production
      tls: process.env.REDIS_HOST !== '127.0.0.1' && process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
      } : undefined,
    });

    // Event handlers
    redis.on('connect', () => {
      Logger.info(`Redis connected for namespace: ${namespace}`, this.loggerCtx);
    });

    redis.on('error', (error) => {
      Logger.error(`Redis connection error for ${namespace}: ${error.message}`, this.loggerCtx);
    });

    redis.on('close', () => {
      Logger.warn(`Redis connection closed for namespace: ${namespace}`, this.loggerCtx);
    });

    redis.on('reconnecting', () => {
      Logger.info(`Redis reconnecting for namespace: ${namespace}`, this.loggerCtx);
    });

    // Store connection
    this.connections.set(namespace, redis);
    
    Logger.info(`Created Redis connection for namespace: ${namespace}`, this.loggerCtx);
    return redis;
  }

  /**
   * Get connection status for monitoring
   */
  getConnectionStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    this.connections.forEach((redis, namespace) => {
      status[namespace] = redis.status;
    });
    return status;
  }

  /**
   * Get connection count for monitoring
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Close all connections gracefully
   */
  async closeAllConnections(): Promise<void> {
    Logger.info(`Closing ${this.connections.size} Redis connections...`, this.loggerCtx);
    
    const closePromises = Array.from(this.connections.values()).map(async (redis) => {
      try {
        await redis.quit();
      } catch (error) {
        Logger.error(`Error closing Redis connection: ${error}`, this.loggerCtx);
      }
    });

    await Promise.all(closePromises);
    this.connections.clear();
    Logger.info('All Redis connections closed', this.loggerCtx);
  }

  /**
   * Health check for all connections
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, boolean> }> {
    const details: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [namespace, redis] of this.connections) {
      try {
        await redis.ping();
        details[namespace] = true;
      } catch (error) {
        details[namespace] = false;
        allHealthy = false;
        Logger.error(`Redis health check failed for ${namespace}: ${error}`, this.loggerCtx);
      }
    }

    return { healthy: allHealthy, details };
  }
}

/**
 * Convenience function to get the default Redis connection
 */
export function getRedisConnection(namespace?: string): Redis {
  return RedisConnectionPool.getInstance().getConnection(namespace);
}

/**
 * Get Redis health status for monitoring
 */
export async function getRedisHealthStatus(): Promise<{ healthy: boolean; details: Record<string, boolean> }> {
  return RedisConnectionPool.getInstance().healthCheck();
}


