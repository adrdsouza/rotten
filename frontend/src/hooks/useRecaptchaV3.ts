import { useSignal, useVisibleTask$ } from '@qwik.dev/core';
import type { RecaptchaV3Config } from '../types/security';

/**
 * Hook for Google reCAPTCHA v3 integration
 * Returns only serializable values - no functions!
 * Use the global executeRecaptcha function for token generation
 */
export const useRecaptchaV3 = (config: RecaptchaV3Config) => {
  const isLoaded = useSignal(false);
  const error = useSignal<{ code: string; message: string } | null>(null);

  // Load reCAPTCHA script only on client side
  useVisibleTask$(() => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.grecaptcha) {
      isLoaded.value = true;
      return;
    }

    const script = document.createElement('script');
    const apiUrl = config.enterprise 
      ? `https://www.google.com/recaptcha/enterprise.js?render=${config.siteKey}`
      : `https://www.google.com/recaptcha/api.js?render=${config.siteKey}`;
    script.src = apiUrl;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.grecaptcha) {
        const recaptchaAPI = config.enterprise && window.grecaptcha.enterprise 
          ? window.grecaptcha.enterprise 
          : window.grecaptcha;
          
        recaptchaAPI.ready(() => {
          isLoaded.value = true;
          
          // Hide badge if requested
          if (config.hideDefaultBadge) {
            const badge = document.querySelector('.grecaptcha-badge');
            if (badge) {
              (badge as HTMLElement).style.visibility = 'hidden';
            }
          }
        });
      }
    };

    script.onerror = () => {
      error.value = {
        code: 'SCRIPT_LOAD_ERROR',
        message: 'Failed to load reCAPTCHA script'
      };
    };

    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  });

  // Return only serializable values
  return {
    isLoaded,
    error,
    siteKey: config.siteKey,
    enterprise: config.enterprise || false
  };
};

/**
 * Global utility to execute reCAPTCHA for specific actions
 * This function is safe to use in $ scopes since it's not returned from a hook
 */
export const executeRecaptcha = async (action: string, siteKey?: string, enterprise = false): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.grecaptcha) {
      reject(new Error('reCAPTCHA not available'));
      return;
    }

    const recaptchaAPI = enterprise && window.grecaptcha.enterprise 
      ? window.grecaptcha.enterprise 
      : window.grecaptcha;
    
    recaptchaAPI.ready(async () => {
      try {
        const key = siteKey || import.meta.env.PUBLIC_RECAPTCHA_V3_SITE_KEY || '6LcAflkrAAAAADhVJbtEqp3ti6aoYIVmbpyXpQ3B';
        const token = await recaptchaAPI.execute(key, { 
          action: action.toLowerCase() 
        });
        
        // Store globally for GraphQL interceptor
        if (typeof window !== 'undefined') {
          (window as any).__recaptcha_token = token;
        }
        
        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
};
