import { component$ } from '@qwik.dev/core';
import type { HoneypotField } from '../../types/security';

interface HoneypotFieldsProps {
  fields?: HoneypotField[];
  prefix?: string;
}

/**
 * Honeypot fields component for bot detection
 * These fields are invisible to humans but may be filled by bots
 */
export const HoneypotFields = component$<HoneypotFieldsProps>(({ 
  fields = [
    { name: 'website', type: 'url', label: 'Website' },
    { name: 'company', type: 'text', label: 'Company' },
    { name: 'phone_number', type: 'tel', label: 'Phone' },
    { name: 'fax', type: 'tel', label: 'Fax Number' }
  ],
  prefix = 'hp_'
}) => {
  return (
    <div class="honeypot-container" style={{ display: 'none' }}>
      {fields.map((field) => (
        <div key={field.name} class="honeypot-field">
          <label for={`${prefix}${field.name}`}>
            {field.label || field.name}
          </label>
          <input
            type={field.type}
            id={`${prefix}${field.name}`}
            name={`${prefix}${field.name}`}
            tabIndex={-1}
            autoComplete="off"
            style={{
              position: 'absolute',
              left: '-9999px',
              top: '-9999px',
              width: '1px',
              height: '1px',
              opacity: 0,
              pointerEvents: 'none'
            }}
          />
        </div>
      ))}
      
      {/* Time tracking field */}
      <input
        type="hidden"
        name="form_start_time"
        value={Date.now()}
      />
      
      {/* Additional CSS-based invisible field */}
      <div 
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          visibility: 'hidden'
        }}
      >
        <input 
          type="text" 
          name="email_confirm" 
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
    </div>
  );
});

/**
 * Validate honeypot fields on form submission
 */
export const validateHoneypotFields = (formData: FormData, prefix = 'hp_'): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  // Check honeypot fields
  const honeypotFields = ['website', 'company', 'phone_number', 'fax', 'email_confirm'];
  
  for (const field of honeypotFields) {
    const fieldName = field === 'email_confirm' ? field : `${prefix}${field}`;
    const value = formData.get(fieldName);
    
    if (value && value.toString().trim() !== '') {
      errors.push(`Honeypot field ${field} was filled`);
    }
  }
  
  // Check form submission timing
  const formStartTime = formData.get('form_start_time');
  if (formStartTime) {
    const startTime = parseInt(formStartTime.toString());
    const submissionTime = Date.now() - startTime;
    
    // Forms submitted in less than 3 seconds are suspicious
    if (submissionTime < 3000) {
      errors.push(`Form submitted too quickly: ${submissionTime}ms`);
    }
    
    // Forms submitted in less than 1 second are very suspicious
    if (submissionTime < 1000) {
      errors.push(`Extremely fast submission: ${submissionTime}ms`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Client-side bot detection utilities
 */
export const botDetectionUtils = {
  /**
   * Check if user agent looks like a bot
   */
  isUserAgentSuspicious: (): boolean => {
    if (typeof navigator === 'undefined') return false;
    
    const userAgent = navigator.userAgent.toLowerCase();
    const botPatterns = [
      'bot', 'crawl', 'spider', 'scrape',
      'python', 'curl', 'wget', 'httpie',
      'headless', 'phantom', 'selenium'
    ];
    
    return botPatterns.some(pattern => userAgent.includes(pattern));
  },

  /**
   * Check if browser has expected features
   */
  hasBrowserFeatures: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    const expectedFeatures = [
      'localStorage',
      'sessionStorage',
      'addEventListener',
      'querySelector'
    ];
    
    return expectedFeatures.every(feature => feature in window);
  },

  /**
   * Check for automated browser indicators
   */
  hasAutomationIndicators: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    // Check for common automation properties
    const indicators = [
      'webdriver' in window,
      '_phantom' in window,
      'callPhantom' in window,
      '_selenium' in window,
      '__webdriver_script_fn' in document
    ];
    
    return indicators.some(indicator => indicator);
  },

  /**
   * Get bot detection score (0-1, higher = more likely bot)
   */
  getBotScore: (): number => {
    let score = 0;
    
    if (botDetectionUtils.isUserAgentSuspicious()) score += 0.4;
    if (!botDetectionUtils.hasBrowserFeatures()) score += 0.3;
    if (botDetectionUtils.hasAutomationIndicators()) score += 0.5;
    
    return Math.min(score, 1);
  }
};
