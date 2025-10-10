import { Logger } from '@vendure/core';

/**
 * PCI Compliance: Error Handler Middleware
 * 
 * Sanitizes all error responses to prevent information disclosure about:
 * - Database type and version
 * - Connection details
 * - Internal system information
 * - Stack traces
 * 
 * Full error details are logged server-side only.
 */

const IS_PRODUCTION = process.env.APP_ENV === 'prod' || process.env.NODE_ENV === 'production';

interface SanitizedError {
  message: string;
  code?: string;
  statusCode: number;
}

/**
 * Sanitize error messages to remove sensitive information
 */
function sanitizeErrorMessage(error: any): SanitizedError {
  const originalMessage = error.message || 'An error occurred';
  
  // List of sensitive patterns to detect and sanitize
  const sensitivePatterns = [
    /postgres/gi,
    /postgresql/gi,
    /database/gi,
    /connection/gi,
    /ECONNREFUSED/gi,
    /ETIMEDOUT/gi,
    /ENOTFOUND/gi,
    /port \d+/gi,
    /host [^\s]+/gi,
    /password/gi,
    /username/gi,
    /credential/gi,
    /authentication/gi,
    /version \d+/gi,
    /pg_/gi,
    /typeorm/gi,
    /sequelize/gi,
    /mysql/gi,
    /mongodb/gi,
    /redis/gi,
    /localhost/gi,
    /127\.0\.0\.1/gi,
    /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/gi, // IP addresses
  ];

  // Check if error message contains sensitive information
  const containsSensitiveInfo = sensitivePatterns.some(pattern => 
    pattern.test(originalMessage)
  );

  if (IS_PRODUCTION && containsSensitiveInfo) {
    // Return generic error message in production
    return {
      message: 'An internal error occurred. Please try again later.',
      code: 'INTERNAL_ERROR',
      statusCode: error.statusCode || 500
    };
  }

  // In development or for non-sensitive errors, return sanitized message
  // but still remove specific technical details
  let sanitizedMessage = originalMessage;
  
  if (IS_PRODUCTION) {
    // Remove stack traces and file paths
    sanitizedMessage = sanitizedMessage.split('\n')[0]; // Only first line
    sanitizedMessage = sanitizedMessage.replace(/at .+/g, ''); // Remove "at" traces
    sanitizedMessage = sanitizedMessage.replace(/\/[^\s]+/g, ''); // Remove file paths
  }

  return {
    message: sanitizedMessage,
    code: error.code || 'ERROR',
    statusCode: error.statusCode || 500
  };
}

/**
 * Sanitize GraphQL errors
 */
export function sanitizeGraphQLError(error: any): any {
  // Log full error server-side
  Logger.error(
    `GraphQL error: ${error.message}`,
    'GraphQLError',
    JSON.stringify({
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: error.extensions,
    }, null, 2)
  );

  if (!IS_PRODUCTION) {
    return error; // Return full error in development
  }

  // Check if error contains sensitive information
  const sanitized = sanitizeErrorMessage(error);
  
  return {
    message: sanitized.message,
    extensions: {
      code: sanitized.code,
    }
  };
}

/**
 * Sanitize database connection errors specifically
 */
export function sanitizeDatabaseError(error: any): Error {
  const sanitized = new Error('Database connection error');
  
  if (!IS_PRODUCTION) {
    // In development, preserve some details
    sanitized.message = `Database error: ${error.message}`;
  }
  
  // Log full error server-side
  Logger.error(
    `Database error: ${error.message}`,
    'DatabaseError',
    error.stack
  );
  
  return sanitized;
}

