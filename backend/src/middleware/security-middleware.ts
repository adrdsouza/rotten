import { Request, Response, NextFunction } from 'express';
import { createRecaptchaMiddleware } from '../utils/recaptcha-verification';
import { isValidRateLimit } from '../utils/redis-rate-limiter';
import { securityLogger } from '../utils/security-logger';

/**
 * Simplified Security middleware for Vendure
 * Uses reCAPTCHA Enterprise for bot detection and Redis for rate limiting
 */
export class SecurityMiddleware {
  private recaptchaMiddlewares: Map<string, (token: string) => Promise<boolean>> = new Map();

  constructor() {
    this.initializeRecaptchaMiddlewares();
  }

  private initializeRecaptchaMiddlewares() {
    // Create reCAPTCHA middlewares for different actions with appropriate thresholds
    this.recaptchaMiddlewares.set('LOGIN', createRecaptchaMiddleware('LOGIN', 0.7));
    this.recaptchaMiddlewares.set('REGISTER', createRecaptchaMiddleware('REGISTER', 0.6));
    this.recaptchaMiddlewares.set('CHECKOUT', createRecaptchaMiddleware('CHECKOUT', 0.5));
    this.recaptchaMiddlewares.set('CONTACT', createRecaptchaMiddleware('CONTACT', 0.3));
  }

  /**
   * General GraphQL security middleware
   */
  public graphqlSecurity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = this.getClientIdentifier(req);

      // Apply rate limiting (increased for more logical usage)
      const rateLimitResult = await isValidRateLimit(
        `graphql:${clientId}`,
        3000, // 3000 requests per 15 minutes (200 req/min)
        15 * 60 * 1000 // per 15 minutes
      );

      if (!rateLimitResult.allowed) {
        securityLogger.logRateLimit({
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || '',
          endpoint: req.path,
          action: 'graphql',
          blocked: true,
          attempts: 3000,
          windowMs: 15 * 60 * 1000
        });

        return res.status(429).json({
          error: 'Too many API requests',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        });
      }

      // Check for suspicious GraphQL patterns (basic checks only)
      if (this.detectSuspiciousGraphQL(req)) {
        securityLogger.logSuspicious({
          event: 'GRAPHQL_QUERY',
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || '',
          endpoint: req.path,
          severity: 'MEDIUM',
          description: 'Suspicious GraphQL query detected'
        });

        return res.status(429).json({
          error: 'Query complexity too high',
          code: 'QUERY_TOO_COMPLEX'
        });
      }

      next();
    } catch (error) {
      console.error('GraphQL security middleware error:', error);
      next(); // Allow request to continue on error
    }
  };

  /**
   * Authentication security middleware
   */
  public authenticationSecurity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = this.getClientIdentifier(req);

      // Rate limiting for authentication (adjusted to be more user-friendly)
      const rateLimitResult = await isValidRateLimit(
        `auth:${clientId}`,
        10, // 10 attempts (more reasonable)
        15 * 60 * 1000 // per 15 minutes (instead of 1 hour)
      );

      if (!rateLimitResult.allowed) {
        securityLogger.logRateLimit({
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || '',
          endpoint: req.path,
          action: 'authentication',
          blocked: true,
          attempts: 10,
          windowMs: 15 * 60 * 1000
        });

        return res.status(429).json({
          error: 'Too many authentication attempts',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        });
      }

      // reCAPTCHA verification for authentication
      const recaptchaToken = req.body?.recaptchaToken || req.headers['x-recaptcha-token'];
      if (recaptchaToken) {
        const recaptchaMiddleware = this.recaptchaMiddlewares.get('LOGIN');
        if (recaptchaMiddleware && !await recaptchaMiddleware(recaptchaToken)) {
          securityLogger.logRecaptcha({
            success: false,
            action: 'LOGIN',
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || '',
            errorCodes: ['verification_failed']
          });
          
          return res.status(400).json({
            error: 'Security verification failed',
            code: 'RECAPTCHA_FAILED'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Authentication security middleware error:', error);
      next();
    }
  };

  /**
   * Checkout security middleware
   */
  public checkoutSecurity = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = this.getClientIdentifier(req);

      // Rate limiting for checkout
      const rateLimitResult = await isValidRateLimit(
        `checkout:${clientId}`,
        10, // 10 attempts
        5 * 60 * 1000 // per 5 minutes
      );

      if (!rateLimitResult.allowed) {
        securityLogger.logRateLimit({
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || '',
          endpoint: req.path,
          action: 'checkout',
          blocked: true,
          attempts: 10,
          windowMs: 5 * 60 * 1000
        });

        return res.status(429).json({
          error: 'Too many checkout attempts',
          code: 'RATE_LIMITED',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        });
      }

      // reCAPTCHA verification for checkout
      const recaptchaToken = req.body?.recaptchaToken || req.headers['x-recaptcha-token'];
      if (recaptchaToken) {
        const recaptchaMiddleware = this.recaptchaMiddlewares.get('CHECKOUT');
        if (recaptchaMiddleware && !await recaptchaMiddleware(recaptchaToken)) {
          securityLogger.logRecaptcha({
            success: false,
            action: 'CHECKOUT',
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || '',
            errorCodes: ['verification_failed']
          });
          
          return res.status(400).json({
            error: 'Checkout security verification failed',
            code: 'RECAPTCHA_FAILED'
          });
        }
      }

      next();
    } catch (error) {
      console.error('Checkout security middleware error:', error);
      next();
    }
  };

  /**
   * Get client identifier for rate limiting
   */
  private getClientIdentifier(req: Request): string {
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Basic suspicious GraphQL query detection
   * (reCAPTCHA Enterprise handles comprehensive bot detection)
   */
  private detectSuspiciousGraphQL(req: Request): boolean {
    const query = req.body?.query || '';
    
    // Only check for extremely obvious issues
    // Let reCAPTCHA Enterprise handle sophisticated bot detection

    // Check for overly deep queries (basic DoS protection)
    const depth = this.calculateQueryDepth(query);
    if (depth > 15) {
      return true;
    }

    // Check for introspection in production
    if (process.env.NODE_ENV === 'production' && query.includes('__schema')) {
      return true;
    }

    // Check for extremely large queries
    if (query.length > 50000) {
      return true;
    }

    return false;
  }

  /**
   * Calculate GraphQL query depth
   */
  private calculateQueryDepth(query: string): number {
    let depth = 0;
    let currentDepth = 0;
    
    for (const char of query) {
      if (char === '{') {
        currentDepth++;
        depth = Math.max(depth, currentDepth);
      } else if (char === '}') {
        currentDepth--;
      }
    }
    
    return depth;
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();

/**
 * Create security middleware for Vendure configuration
 */
export function createSecurityMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Apply GraphQL security checks
      await securityMiddleware.graphqlSecurity(req, res, next);
    } catch (error) {
      console.error('Security middleware error:', error);
      next(); // Allow request to continue on error
    }
  };
}
