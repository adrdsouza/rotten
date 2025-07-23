// Types for reCAPTCHA v3
export interface RecaptchaV3Config {
  siteKey: string;
  action?: string; // Optional here, can be provided during execute()
  hideDefaultBadge?: boolean;
  timeout?: number;
  enterprise?: boolean; // Enable Enterprise API
}

export interface RecaptchaV3Response {
  token: string;
  action: string;
}

export interface RecaptchaV3Error {
  code: string;
  message: string;
}

// Global reCAPTCHA interface declarations
declare global {
  interface Window {
    __recaptcha_token?: string;
    executeRecaptcha?: (action: string, siteKey?: string, enterprise?: boolean) => Promise<string>;
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (container: string | HTMLElement, options: any) => number;
      enterprise?: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

// Types for bot detection
export interface HoneypotField {
  name: string;
  type: 'text' | 'email' | 'tel' | 'url';
  label?: string;
}

export interface BotDetectionOptions {
  enableHoneypot?: boolean;
  honeypotFields?: HoneypotField[];
  minFormTime?: number;
  trackTiming?: boolean;
}

// Types for rate limiting
export interface RateLimitConfig {
  action: string;
  maxAttempts: number;
  windowMs: number;
  storageKey: string;
}

export interface RateLimitState {
  attempts: number;
  windowStart: number;
  blocked: boolean;
  resetTime: number;
}

// Types for CSRF protection
export interface CSRFToken {
  token: string;
  timestamp: number;
  action?: string;
}

// Security configuration
export interface SecurityConfig {
  recaptcha: {
    enabled: boolean;
    siteKey: string;
    actions: {
      login: string;
      register: string;
      checkout: string;
      contact: string;
    };
  };
  rateLimit: {
    enabled: boolean;
    configs: {
      login: RateLimitConfig;
      register: RateLimitConfig;
      checkout: RateLimitConfig;
      contact: RateLimitConfig;
    };
  };
  botDetection: {
    enabled: boolean;
    honeypotFields: HoneypotField[];
    minFormTime: number;
  };
  csrf: {
    enabled: boolean;
    tokenName: string;
    headerName: string;
  };
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Security event types
export interface SecurityEvent {
  type: 'rate_limit' | 'bot_detected' | 'recaptcha_failed' | 'csrf_invalid';
  timestamp: number;
  details: Record<string, any>;
}

// Hook return types
export interface UseRecaptchaReturn {
  isLoaded: boolean;
  execute: (action: string) => Promise<string>;
  error: RecaptchaV3Error | null;
}

export interface UseRateLimitReturn {
  isBlocked: boolean;
  attempts: number;
  resetTime: number;
  checkLimit: () => boolean;
  reset: () => void;
}

export interface UseBotDetectionReturn {
  honeypotProps: Record<string, any>;
  isValid: boolean;
  startTiming: () => void;
  validateForm: (data: FormData) => boolean;
}

// Enhanced form types with security
export interface SecureFormData extends FormData {
  recaptchaToken?: string;
  csrfToken?: string;
  formStartTime?: number;
  honeypotFields?: Record<string, string>;
}

export interface SecureFormConfig {
  action: string;
  requireRecaptcha?: boolean;
  requireCSRF?: boolean;
  enableBotDetection?: boolean;
  rateLimit?: RateLimitConfig;
}
