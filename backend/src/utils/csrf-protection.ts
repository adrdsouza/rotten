import { randomBytes, createHash } from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface CSRFToken {
  token: string;
  timestamp: number;
  action?: string;
}

export interface CSRFOptions {
  secret: string;
  tokenName?: string;
  headerName?: string;
  cookieName?: string;
  tokenLifetime?: number; // in milliseconds
  doubleSubmitCookie?: boolean;
}

/**
 * CSRF Protection utility for Vendure
 * Implements double-submit cookie pattern with additional security measures
 */
export class CSRFProtection {
  private secret: string;
  private tokenName: string;
  private headerName: string;
  private cookieName: string;
  private tokenLifetime: number;
  private doubleSubmitCookie: boolean;

  constructor(options: CSRFOptions) {
    this.secret = options.secret;
    this.tokenName = options.tokenName || 'csrfToken';
    this.headerName = options.headerName || 'x-csrf-token';
    this.cookieName = options.cookieName || '__csrf_token';
    this.tokenLifetime = options.tokenLifetime || 24 * 60 * 60 * 1000; // 24 hours
    this.doubleSubmitCookie = options.doubleSubmitCookie !== false;
  }

  /**
   * Generate a CSRF token
   */
  public generateToken(action?: string): CSRFToken {
    const tokenData = {
      random: randomBytes(32).toString('hex'),
      timestamp: Date.now(),
      action: action || 'general'
    };

    // Create signed token
    const payload = JSON.stringify(tokenData);
    const signature = this.createSignature(payload);
    const token = Buffer.from(`${payload}.${signature}`).toString('base64');

    return {
      token,
      timestamp: tokenData.timestamp,
      action: tokenData.action
    };
  }

  /**
   * Verify a CSRF token
   */
  public verifyToken(token: string, expectedAction?: string): boolean {
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [payload, signature] = decoded.split('.');
      
      if (!payload || !signature) {
        return false;
      }

      // Verify signature
      if (signature !== this.createSignature(payload)) {
        return false;
      }

      // Parse payload
      const tokenData = JSON.parse(payload);
      
      // Check timestamp
      if (Date.now() - tokenData.timestamp > this.tokenLifetime) {
        return false;
      }

      // Check action if specified
      if (expectedAction && tokenData.action !== expectedAction) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('CSRF token verification error:', error);
      return false;
    }
  }

  /**
   * Create signature for token
   */
  private createSignature(payload: string): string {
    return createHash('sha256')
      .update(payload)
      .update(this.secret)
      .digest('hex');
  }

  /**
   * Middleware to generate and set CSRF token
   */
  public generateMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const action = this.extractActionFromRequest(req);
    const csrfToken = this.generateToken(action);

    // Set token in response locals for templates
    res.locals.csrfToken = csrfToken.token;

    if (this.doubleSubmitCookie) {
      // Set CSRF token in cookie (double-submit pattern)
      res.cookie(this.cookieName, csrfToken.token, {
        httpOnly: false, // Need to be accessible by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: this.tokenLifetime
      });
    }

    // Set token in header for client access
    res.setHeader('X-CSRF-Token', csrfToken.token);

    next();
  };

  /**
   * Middleware to verify CSRF token
   */
  public verifyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Skip verification for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const token = this.extractTokenFromRequest(req);
    const expectedAction = this.extractActionFromRequest(req);

    if (!token) {
      return res.status(403).json({
        error: 'CSRF token missing',
        code: 'CSRF_TOKEN_MISSING'
      });
    }

    if (!this.verifyToken(token, expectedAction)) {
      return res.status(403).json({
        error: 'Invalid CSRF token',
        code: 'CSRF_TOKEN_INVALID'
      });
    }

    // Additional double-submit cookie verification
    if (this.doubleSubmitCookie) {
      const cookieToken = req.cookies[this.cookieName];
      if (!cookieToken || cookieToken !== token) {
        return res.status(403).json({
          error: 'CSRF token mismatch',
          code: 'CSRF_TOKEN_MISMATCH'
        });
      }
    }

    next();
  };

  /**
   * Extract CSRF token from request
   */
  private extractTokenFromRequest(req: Request): string | null {
    // Check header first
    let token = req.headers[this.headerName] as string;
    
    // Check body
    if (!token && req.body) {
      token = req.body[this.tokenName];
    }

    // Check query parameters (less secure, but sometimes needed)
    if (!token && req.query) {
      token = req.query[this.tokenName] as string;
    }

    return token || null;
  }

  /**
   * Extract action from request for action-specific tokens
   */
  private extractActionFromRequest(req: Request): string {
    // Try to determine action from URL path
    if (req.path.includes('/auth/login')) return 'LOGIN';
    if (req.path.includes('/auth/register')) return 'REGISTER';
    if (req.path.includes('/checkout')) return 'CHECKOUT';
    if (req.path.includes('/contact')) return 'CONTACT';
    
    // Check GraphQL operation
    if (req.body?.operationName) {
      return req.body.operationName.toUpperCase();
    }

    return 'GENERAL';
  }

  /**
   * Create CSRF protection for specific routes
   */
  public createProtection(action?: string) {
    return {
      generate: (req: Request, res: Response, next: NextFunction) => {
        const csrfToken = this.generateToken(action);
        res.locals.csrfToken = csrfToken.token;
        
        if (this.doubleSubmitCookie) {
          res.cookie(this.cookieName, csrfToken.token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: this.tokenLifetime
          });
        }
        
        res.setHeader('X-CSRF-Token', csrfToken.token);
        next();
      },
      
      verify: (req: Request, res: Response, next: NextFunction) => {
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
          return next();
        }

        const token = this.extractTokenFromRequest(req);
        
        if (!token || !this.verifyToken(token, action)) {
          return res.status(403).json({
            error: 'CSRF protection failed',
            code: 'CSRF_FAILED'
          });
        }

        if (this.doubleSubmitCookie) {
          const cookieToken = req.cookies[this.cookieName];
          if (!cookieToken || cookieToken !== token) {
            return res.status(403).json({
              error: 'CSRF token mismatch',
              code: 'CSRF_TOKEN_MISMATCH'
            });
          }
        }

        next();
      }
    };
  }
}

/**
 * Create CSRF protection instance
 */
export function createCSRFProtection(options: CSRFOptions): CSRFProtection {
  return new CSRFProtection(options);
}

/**
 * Default CSRF protection for Vendure
 */
export const csrfProtection = createCSRFProtection({
  secret: process.env.CSRF_SECRET || process.env.COOKIE_SECRET || 'default-csrf-secret',
  tokenName: 'csrfToken',
  headerName: 'x-csrf-token',
  cookieName: '__vendure_csrf',
  tokenLifetime: 24 * 60 * 60 * 1000, // 24 hours
  doubleSubmitCookie: true
});

/**
 * Validate CSRF token from request
 * Helper function for GraphQL and other contexts
 */
export async function validateCSRFToken(
  req: Request, 
  token: string, 
  action?: string
): Promise<boolean> {
  try {
    return csrfProtection.verifyToken(token, action?.toUpperCase());
  } catch (error) {
    console.error('CSRF token validation error:', error);
    return false;
  }
}
