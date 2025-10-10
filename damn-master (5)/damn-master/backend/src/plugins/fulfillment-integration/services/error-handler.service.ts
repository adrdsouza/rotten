import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
}

@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);

  private readonly defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
  };

  async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {},
    operationName = 'operation'
  ): Promise<RetryResult<T>> {
    const opts = { ...this.defaultRetryOptions, ...options };
    let lastError: Error | undefined;
    let attempts = 0;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        this.logger.debug(`Attempting ${operationName} (attempt ${attempts}/${opts.maxRetries + 1})`);
        const result = await operation();

        if (attempt > 0) {
          this.logger.log(`${operationName} succeeded after ${attempts} attempts`);
        }

        return {
          success: true,
          result,
          attempts,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < opts.maxRetries) {
          const delay = this.calculateDelay(attempt, opts);
          this.logger.warn(
            `${operationName} failed (attempt ${attempts}/${opts.maxRetries + 1}): ${lastError.message}. Retrying in ${delay}ms`
          );
          await this.sleep(delay);
        } else {
          this.logger.error(
            `${operationName} failed after ${attempts} attempts: ${lastError.message}`,
            lastError.stack
          );
        }
      }
    }

    return {
      success: false,
      error: lastError || new Error('Unknown error'),
      attempts,
    };
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    const delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt);
    return Math.min(delay, options.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isRetryableError(error: any): boolean {
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP errors that are typically retryable
    if (error.response?.status) {
      const status = error.response.status;
      return status >= 500 || status === 429; // Server errors or rate limiting
    }

    // Axios timeout errors
    if (error.code === 'ECONNABORTED') {
      return true;
    }

    return false;
  }

  categorizeError(error: any): {
    category: 'network' | 'authentication' | 'validation' | 'server' | 'unknown';
    isRetryable: boolean;
    message: string;
  } {
    let category: 'network' | 'authentication' | 'validation' | 'server' | 'unknown' = 'unknown';
    let isRetryable = false;
    let message = error.message || 'Unknown error';

    if (error.response?.status) {
      const status = error.response.status;
      
      if (status === 401 || status === 403) {
        category = 'authentication';
        isRetryable = false;
        message = 'Authentication failed - check API credentials';
      } else if (status >= 400 && status < 500) {
        category = 'validation';
        isRetryable = false;
        message = error.response.data?.message || 'Request validation failed';
      } else if (status >= 500) {
        category = 'server';
        isRetryable = true;
        message = 'Server error - will retry';
      } else if (status === 429) {
        category = 'server';
        isRetryable = true;
        message = 'Rate limited - will retry';
      }
    } else if (error.code) {
      if (['ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNABORTED'].includes(error.code)) {
        category = 'network';
        isRetryable = true;
        message = `Network error: ${error.code}`;
      }
    }

    return { category, isRetryable, message };
  }

  logError(error: any, context: string, additionalData?: any): void {
    const errorInfo = this.categorizeError(error);
    
    const logData = {
      context,
      category: errorInfo.category,
      isRetryable: errorInfo.isRetryable,
      message: errorInfo.message,
      originalError: error.message,
      ...additionalData,
    };

    if (errorInfo.category === 'network' || errorInfo.isRetryable) {
      this.logger.warn('Retryable error occurred', logData);
    } else {
      this.logger.error('Non-retryable error occurred', logData);
    }
  }

  createCircuitBreaker(
    failureThreshold: number = 5,
    resetTimeout: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return {
      async execute<T>(operation: () => Promise<T>): Promise<T> {
        const now = Date.now();

        if (state === 'open') {
          if (now - lastFailureTime > resetTimeout) {
            state = 'half-open';
          } else {
            throw new Error('Circuit breaker is open');
          }
        }

        try {
          const result = await operation();
          
          if (state === 'half-open') {
            state = 'closed';
            failures = 0;
          }
          
          return result;
        } catch (error) {
          failures++;
          lastFailureTime = now;

          if (failures >= failureThreshold) {
            state = 'open';
          }

          throw error;
        }
      },

      getState: () => ({ state, failures, lastFailureTime }),
      reset: () => {
        state = 'closed';
        failures = 0;
        lastFailureTime = 0;
      },
    };
  }
}
