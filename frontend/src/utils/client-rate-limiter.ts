import type { RateLimitConfig, RateLimitState } from '../types/security';

/**
 * Client-side rate limiter using localStorage
 * Provides UX feedback while security is enforced server-side
 */
export class ClientRateLimiter {
  private storagePrefix = 'rate_limit_';

  /**
   * Check if action is rate limited
   */
  checkRateLimit(config: RateLimitConfig): RateLimitState {
    const now = Date.now();
    const key = this.getStorageKey(config.storageKey);
    
    try {
      const stored = localStorage.getItem(key);
      let state: RateLimitState;

      if (!stored) {
        state = {
          attempts: 0,
          windowStart: now,
          blocked: false,
          resetTime: now + config.windowMs
        };
      } else {
        state = JSON.parse(stored);
        
        // Reset if window has expired
        if (now - state.windowStart >= config.windowMs) {
          state = {
            attempts: 0,
            windowStart: now,
            blocked: false,
            resetTime: now + config.windowMs
          };
        }
      }

      return state;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return {
        attempts: 0,
        windowStart: now,
        blocked: false,
        resetTime: now + config.windowMs
      };
    }
  }

  /**
   * Record an attempt and check if rate limited
   */
  recordAttempt(config: RateLimitConfig): RateLimitState {
    const state = this.checkRateLimit(config);
    
    state.attempts += 1;
    state.blocked = state.attempts >= config.maxAttempts;
    
    if (state.blocked) {
      state.resetTime = Date.now() + config.windowMs;
    }

    try {
      localStorage.setItem(this.getStorageKey(config.storageKey), JSON.stringify(state));
    } catch (error) {
      console.error('Error storing rate limit state:', error);
    }

    return state;
  }

  /**
   * Reset rate limit for a specific action
   */
  resetRateLimit(storageKey: string): void {
    try {
      localStorage.removeItem(this.getStorageKey(storageKey));
    } catch (error) {
      console.error('Error resetting rate limit:', error);
    }
  }

  /**
   * Get remaining time until reset (in milliseconds)
   */
  getTimeUntilReset(state: RateLimitState): number {
    return Math.max(0, state.resetTime - Date.now());
  }

  /**
   * Format remaining time for display
   */
  formatTimeRemaining(ms: number): string {
    if (ms <= 0) return '0 seconds';

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  /**
   * Clean up expired rate limit entries
   */
  cleanup(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.storagePrefix)) continue;

        const stored = localStorage.getItem(key);
        if (!stored) continue;

        try {
          const state: RateLimitState = JSON.parse(stored);
          if (now > state.resetTime) {
            keysToRemove.push(key);
          }
        } catch {
          // Invalid data, remove it
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error during rate limit cleanup:', error);
    }
  }

  private getStorageKey(key: string): string {
    return `${this.storagePrefix}${key}`;
  }
}

/**
 * Default rate limit configurations
 */
export const defaultRateLimitConfigs = {
  login: {
    action: 'login',
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    storageKey: 'login'
  },
  register: {
    action: 'register',
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    storageKey: 'register'
  },
  checkout: {
    action: 'checkout',
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    storageKey: 'checkout'
  },
  contact: {
    action: 'contact',
    maxAttempts: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    storageKey: 'contact'
  },
  search: {
    action: 'search',
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    storageKey: 'search'
  }
} as const;

/**
 * Global rate limiter instance
 */
export const clientRateLimiter = new ClientRateLimiter();

// Clean up expired entries on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    clientRateLimiter.cleanup();
  });
}

/**
 * Hook for using rate limiting in components
 */
export const useClientRateLimit = (configKey: keyof typeof defaultRateLimitConfigs) => {
  const config = defaultRateLimitConfigs[configKey];
  
  return {
    checkLimit: () => clientRateLimiter.checkRateLimit(config),
    recordAttempt: () => clientRateLimiter.recordAttempt(config),
    reset: () => clientRateLimiter.resetRateLimit(config.storageKey),
    formatTime: (ms: number) => clientRateLimiter.formatTimeRemaining(ms)
  };
};
