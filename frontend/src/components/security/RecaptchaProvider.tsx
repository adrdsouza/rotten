import { component$, Slot, useStore, useTask$, useVisibleTask$ } from '@qwik.dev/core';
import type { SecurityConfig } from '../../types/security';

interface RecaptchaProviderProps {
  config: SecurityConfig['recaptcha'];
  children?: any;
}

/**
 * Global reCAPTCHA provider component
 * Manages reCAPTCHA initialization and provides context to child components
 */
export const RecaptchaProvider = component$<RecaptchaProviderProps>(({ config }) => {
  const state = useStore({
    isLoaded: false,
    isReady: false,
    error: null as string | null,
    siteKey: config.siteKey
  });

  // Load reCAPTCHA script on client side only
  useVisibleTask$(() => {
    if (!config.enabled || typeof window === 'undefined') {
      return;
    }

    // Check if already loaded
    if (window.grecaptcha) {
      state.isLoaded = true;
      window.grecaptcha.ready(() => {
        state.isReady = true;
      });
      return;
    }

    const script = document.createElement('script');
    // Use Enterprise API with your site key
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${config.siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      state.isLoaded = true;
      if (window.grecaptcha) {
        // Use Enterprise API if available
        const api = window.grecaptcha.enterprise || window.grecaptcha;
        api.ready(() => {
          state.isReady = true;
          
          // Hide the reCAPTCHA badge (we'll show our own privacy notice)
          const style = document.createElement('style');
          style.innerHTML = '.grecaptcha-badge { visibility: hidden; }';
          document.head.appendChild(style);
        });
      }
    };

    script.onerror = () => {
      state.error = 'Failed to load reCAPTCHA';
      console.error('reCAPTCHA script failed to load');
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  });

  // Provide reCAPTCHA context to children
  useTask$(() => {
    if (typeof window !== 'undefined') {
      (window as any).recaptchaContext = state;
    }
  });

  return (
    <>
      <Slot />
      {config.enabled && (
        <div class="recaptcha-privacy-notice text-xs text-gray-500 mt-2">
          This site is protected by reCAPTCHA and the Google{' '}
          <a 
            href="https://policies.google.com/privacy" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-primary-600 hover:text-primary-800 underline"
          >
            Privacy Policy
          </a>{' '}
          and{' '}
          <a 
            href="https://policies.google.com/terms" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-primary-600 hover:text-primary-800 underline"
          >
            Terms of Service
          </a>{' '}
          apply.
        </div>
      )}
    </>
  );
});

/**
 * Hook to access reCAPTCHA context
 */
export const useRecaptchaContext = () => {
  if (typeof window === 'undefined') {
    return {
      isLoaded: false,
      isReady: false,
      error: null,
      execute: async () => {
        throw new Error('reCAPTCHA not available on server');
      }
    };
  }

  const context = (window as any).recaptchaContext;
  if (!context) {
    throw new Error('useRecaptchaContext must be used within RecaptchaProvider');
  }

  return {
    ...context,
    execute: async (action: string) => {
      if (!context.isReady || !window.grecaptcha) {
        throw new Error('reCAPTCHA not ready');
      }

      try {
        return await window.grecaptcha.execute(context.siteKey, { action });
      } catch (error) {
        console.error('reCAPTCHA execution failed:', error);
        throw new Error('Failed to generate reCAPTCHA token');
      }
    }
  };
};
