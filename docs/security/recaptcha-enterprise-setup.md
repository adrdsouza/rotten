# reCAPTCHA Enterprise Setup Guide

## Overview

Your storefront is now configured to use **Google reCAPTCHA Enterprise** with the following setup:

- **Site Key**: `6LdVrVgrAAAAAFzKm0fOR3U5CslmCRcm2fFYsri7`
- **Project ID**: `vendure-460019`
- **Enterprise API**: Fully integrated with Google Cloud client library
## Quick Start

### 1. Environment Configuration

Add these environment variables to your backend `.env` file:

```bash
# Required for reCAPTCHA Enterprise
RECAPTCHA_ENTERPRISE_PROJECT_ID=vendure-460019
RECAPTCHA_ENTERPRISE_SITE_KEY=6LdVrVgrAAAAAFzKm0fOR3U5CslmCRcm2fFYsri7

# Get your secret key from Google Cloud Console
RECAPTCHA_ENTERPRISE_SECRET_KEY=your_secret_key_here

# Optional settings
RECAPTCHA_MIN_SCORE=0.5
RECAPTCHA_TIMEOUT=5000
NODE_ENV=production
```

### 2. Google Cloud Authentication

You need to authenticate with Google Cloud. Choose one option:

#### Option A: Service Account Key File
1. Download your service account key JSON file from Google Cloud Console
2. Set the environment variable:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### Option B: Service Account Key JSON (recommended for containers)
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", "project_id": "vendure-460019", ...}'
```

### 3. Get Your Secret Key

1. Go to [Google Cloud Console reCAPTCHA](https://console.cloud.google.com/security/recaptcha)
2. Select your project: `vendure-460019`
3. Find your site key `6LdVrVgrAAAAAFzKm0fOR3U5CslmCRcm2fFYsri7`
4. Copy the secret key and add it to your environment variables

### 4. Test Your Setup

Run the comprehensive security test suite to verify everything is working:

```bash
cd backend
node scripts/test-security.js
```

This will test:
- reCAPTCHA Enterprise verification
- Rate limiting functionality
- CSRF protection
- Security logging
- Error handling

## Architecture Overview

### Security Components

Your storefront now includes these security layers:

1. **reCAPTCHA Enterprise**: Bot detection and risk assessment
2. **Rate Limiting**: Redis-based sliding window rate limiting
3. **CSRF Protection**: Double-submit cookie pattern
4. **Security Logging**: File-based security event logging
5. **Input Validation**: Honeypot fields and form validation

### Backend Security Stack

```
┌─────────────────────────────────────────┐
│             Client Request              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Security Middleware            │
│  • Rate Limiting                       │
│  • reCAPTCHA Enterprise Verification   │
│  • CSRF Token Validation              │
│  • Security Event Logging             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Vendure GraphQL               │
│         Protected Endpoints             │
└─────────────────────────────────────────┘
```

### Frontend Security Integration

The frontend components are ready to use:

```typescript
// In your Qwik components
import { useRecaptchaV3 } from '~/hooks/useRecaptchaV3';

export default component$(() => {
  const { executeRecaptcha, isLoaded } = useRecaptchaV3();
  
  const handleSubmit = $(async () => {
    if (isLoaded) {
      const token = await executeRecaptcha('login');
      // Submit with token
    }
  });
  
  return <form onSubmit$={handleSubmit}>...</form>;
});
```

## File Structure

### Backend Files

```
backend/src/
├── utils/
│   ├── recaptcha-verification.ts     # reCAPTCHA Enterprise client
│   ├── redis-rate-limiter.ts         # Rate limiting logic
│   ├── security-logger.ts            # File-based logging
│   └── csrf-protection.ts            # CSRF utilities
├── middleware/
│   └── security-middleware.ts        # Main security middleware
├── plugins/
│   └── security-plugin.ts            # Vendure security plugin
└── scripts/
    └── test-security.js              # Comprehensive test suite
```

### Frontend Files

```
frontend/src/
├── hooks/
│   └── useRecaptchaV3.ts            # reCAPTCHA hook for Qwik
├── components/security/
│   ├── RecaptchaProvider.tsx        # Provider component
│   ├── HoneypotFields.tsx          # Bot detection fields
│   └── SecureFormExamples.tsx      # Example implementations
├── utils/
│   └── client-rate-limiter.ts      # Client-side rate limiting
└── types/
    └── security.ts                  # TypeScript definitions
```

## Configuration Details

### Rate Limiting Rules

Default rate limits are configured as:

```typescript
const rateLimits = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },      // 5 attempts per 15 minutes
  checkout: { windowMs: 5 * 60 * 1000, maxRequests: 10 },  // 10 attempts per 5 minutes
  graphql: { windowMs: 60 * 1000, maxRequests: 100 },      // 100 requests per minute
  general: { windowMs: 60 * 1000, maxRequests: 60 }        // 60 requests per minute
};
```

### reCAPTCHA Enterprise Scoring

- **Minimum Score**: 0.5 (configurable via `RECAPTCHA_MIN_SCORE`)
- **Actions**: `login`, `checkout`, `contact`, `registration`
- **Assessment API**: Full Enterprise features with risk analysis

### Security Logging

Security events are logged to files with automatic rotation:

```
backend/logs/security/
├── security-YYYY-MM-DD.log         # Daily security events
├── auth-YYYY-MM-DD.log             # Authentication events
├── bot-detection-YYYY-MM-DD.log    # Bot detection events
├── rate-limiting-YYYY-MM-DD.log    # Rate limiting events
└── checkout-YYYY-MM-DD.log         # Checkout security events
```

## Usage Examples

### Protecting Login Forms

```typescript
// Frontend (Qwik)
export const LoginForm = component$(() => {
  const { executeRecaptcha, isLoaded } = useRecaptchaV3();
  const navigate = useNavigate();
  
  const handleLogin = $(async (event: SubmitEvent) => {
    event.preventDefault();
    
    if (!isLoaded) {
      console.error('reCAPTCHA not loaded');
      return;
    }

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('login');
      
      // Get form data
      const formData = new FormData(event.target as HTMLFormElement);
      
      // Submit with security token
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Recaptcha-Token': recaptchaToken,
        },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });

      if (response.ok) {
        navigate('/dashboard');
      } else {
        // Handle error
        console.error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  });

  return (
    <form onSubmit$={handleLogin}>
      {/* Include honeypot fields for additional bot protection */}
      <HoneypotFields />
      
      <input type="email" name="email" required />
      <input type="password" name="password" required />
      <button type="submit">Login</button>
    </form>
  );
});
```

### Protecting Checkout Process

```typescript
// Frontend (Qwik)
export const CheckoutForm = component$(() => {
  const { executeRecaptcha, isLoaded } = useRecaptchaV3();
  
  const handleCheckout = $(async () => {
    const recaptchaToken = await executeRecaptcha('checkout');
    
    // Submit checkout with reCAPTCHA token
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: {
        'X-Recaptcha-Token': recaptchaToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData),
    });
  });

  return (
    <div>
      <HoneypotFields />
      <button onClick$={handleCheckout}>Complete Purchase</button>
    </div>
  );
});
```

## Monitoring and Analytics

### Security Dashboard

Monitor your security through the log files:

```bash
# View real-time security events
tail -f backend/logs/security/security-$(date +%Y-%m-%d).log

# Check rate limiting activity
grep "rate_limit_exceeded" backend/logs/security/rate-limiting-*.log

# Monitor bot detection
grep "bot_detected" backend/logs/security/bot-detection-*.log

# Authentication security events
tail -f backend/logs/security/auth-$(date +%Y-%m-%d).log
```

### Log Analysis

Each security event includes:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "warn",
  "event_type": "rate_limit_exceeded",
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "endpoint": "/api/auth/login",
  "limit_type": "auth",
  "current_count": 6,
  "max_allowed": 5
}
```

## Troubleshooting

### Common Issues

1. **reCAPTCHA Enterprise not working**
   - Verify your Google Cloud credentials
   - Check that the project ID matches
   - Ensure the site key is correct

2. **Rate limiting too strict**
   - Adjust limits in `redis-rate-limiter.ts`
   - Consider different limits for different user types

3. **CSRF token errors**
   - Ensure frontend is sending the token in headers
   - Verify cookie settings for your domain

### Testing Commands

```bash
# Test reCAPTCHA Enterprise
node -e "require('./src/utils/recaptcha-verification').verifyRecaptchaEnterprise('test-token', 'login').then(console.log)"

# Test rate limiting
node -e "require('./src/utils/redis-rate-limiter').checkRateLimit('test-ip', 'auth').then(console.log)"

# Run full security test suite
node scripts/test-security.js
```

## Next Steps

1. **Production Deployment**
   - Set up Google Cloud service account
   - Configure Redis for rate limiting
   - Set up log monitoring

2. **Integration**
   - Add security components to your existing forms
   - Update your GraphQL resolvers to use security middleware
   - Implement security monitoring dashboard

3. **Customization**
   - Adjust rate limiting rules for your traffic patterns
   - Customize reCAPTCHA scoring thresholds
   - Add additional security events to logging

## Support

For issues with this security implementation:

1. Check the security logs for detailed error messages
2. Run the test suite to verify component functionality
3. Review the Google Cloud Console for reCAPTCHA Enterprise status
4. Monitor Redis connections for rate limiting issues

The security system is now fully implemented and ready for production use!
4. Copy the **secret key** and add it to your environment variables

## Frontend Usage

### Basic Form Protection

```tsx
import { executeRecaptcha } from '../hooks/useRecaptchaV3';

const handleSubmit = $(async (event: SubmitEvent) => {
  event.preventDefault();
  
  try {
    // Generate reCAPTCHA token
    const token = await executeRecaptcha('LOGIN');
    
    // Add token to form data
    const formData = new FormData(event.target as HTMLFormElement);
    formData.append('recaptchaToken', token);
    
    // Send to backend
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: formData
    });
    
    // Handle response...
  } catch (error) {
    console.error('reCAPTCHA error:', error);
  }
});
```

### Hook Usage

```tsx
import { useRecaptchaV3 } from '../hooks/useRecaptchaV3';

export const MyForm = component$(() => {
  const recaptcha = useRecaptchaV3({
    siteKey: '6LdVrVgrAAAAAFzKm0fOR3U5CslmCRcm2fFYsri7',
    action: 'LOGIN',
    enterprise: true,
    hideDefaultBadge: true
  });

  const handleSubmit = $(async () => {
    if (!recaptcha.isLoaded) {
      throw new Error('reCAPTCHA not ready');
    }
    
    const token = await recaptcha.execute('LOGIN');
    // Use token...
  });

  return (
    <form onSubmit$={handleSubmit}>
      {/* Form fields */}
    </form>
  );
});
```

## Backend Usage

### Middleware Integration

```typescript
import { createRecaptchaMiddleware } from './utils/recaptcha-verification';

// Create middleware for different actions
const loginRecaptcha = createRecaptchaMiddleware('LOGIN', 0.7);
const checkoutRecaptcha = createRecaptchaMiddleware('CHECKOUT', 0.5);

// Use in routes
app.post('/api/auth/login', async (req, res) => {
  const token = req.body.recaptchaToken;
  
  if (!await loginRecaptcha(token)) {
    return res.status(400).json({ error: 'reCAPTCHA verification failed' });
  }
  
  // Continue with login logic...
});
```

### Direct Verification

```typescript
import { verifyRecaptchaToken } from './utils/recaptcha-verification';

const result = await verifyRecaptchaToken(token, {
  enterprise: true,
  projectId: process.env.RECAPTCHA_ENTERPRISE_PROJECT_ID,
  siteKey: process.env.RECAPTCHA_ENTERPRISE_SITE_KEY,
  expectedAction: 'LOGIN',
  minScore: 0.5
});

if (result.success) {
  console.log('Score:', result.score);
  console.log('Action:', result.action);
} else {
  console.log('Failed:', result.error_codes);
}
```

## Actions Configuration

The system supports these predefined actions:

- **LOGIN** - User authentication
- **CHECKOUT** - Purchase completion
- **REGISTER** - Account creation
- **CONTACT** - Contact form submission
- **SEARCH** - Search queries
- **COMMENT** - User comments

## Score Thresholds

Recommended score thresholds by action:

- **LOGIN**: 0.7 (high security)
- **CHECKOUT**: 0.5 (balanced)
- **REGISTER**: 0.6 (medium-high)
- **CONTACT**: 0.3 (low, allow more users)

## Enterprise Features

Your setup includes these Enterprise features:

1. **Advanced Risk Analysis** - Enhanced bot detection
2. **Detailed Scoring** - More granular risk assessment
3. **Action Validation** - Verify expected user actions
4. **Comprehensive Logging** - Detailed security events
5. **Custom Rules** - Configure advanced policies in Google Cloud

## Monitoring

Monitor your reCAPTCHA usage at:
- [Google Cloud Console](https://console.cloud.google.com/security/recaptcha)
- View traffic patterns, scores, and security events
- Set up alerts for suspicious activity

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify `GOOGLE_APPLICATION_CREDENTIALS` is set correctly
   - Check service account has reCAPTCHA Enterprise API permissions

2. **Invalid Token**
   - Ensure frontend is using the correct site key
   - Check that token is being sent with the action name

3. **Low Scores**
   - Review your score thresholds
   - Check for legitimate users being blocked
   - Monitor patterns in Google Cloud Console

### Development Mode

In development, reCAPTCHA verification is bypassed when `NODE_ENV=development`. Set to `production` for testing.

## Security Best Practices

1. **Never expose secret keys** in frontend code
2. **Use different score thresholds** for different actions
3. **Monitor and adjust** thresholds based on traffic patterns
4. **Implement fallback mechanisms** for network failures
5. **Log security events** for analysis
6. **Regular review** of reCAPTCHA analytics

## Support

- **Google Cloud Support**: Enterprise customers get priority support
- **Documentation**: [reCAPTCHA Enterprise Docs](https://cloud.google.com/recaptcha-enterprise/docs)
- **Best Practices**: [Security Guidelines](https://cloud.google.com/recaptcha-enterprise/docs/best-practices)
