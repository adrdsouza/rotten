# SendPulse Newsletter Integration - Next Steps

## Current Status

✅ **COMPLETED:**
1. **Research & Planning** - Analyzed SendPulse API and created implementation plan
2. **Dependencies** - Installed `sendpulse-api` and `joi` packages
3. **SendPulse Service** - Created comprehensive service class at `backend/src/services/sendpulse.service.ts`

## Next Implementation Phase

### 1. Newsletter Plugin Creation
**File:** `backend/src/plugins/newsletter/newsletter.plugin.ts`

Need to create a Vendure plugin that:
- Registers the SendPulse service as a provider
- Defines GraphQL schema for newsletter operations
- Implements resolvers for subscription/unsubscription
- Handles proper error responses

**GraphQL Schema to Add:**
```graphql
extend type Mutation {
  subscribeToNewsletter(input: NewsletterSubscriptionInput!): NewsletterSubscriptionResult!
  unsubscribeFromNewsletter(email: String!): NewsletterUnsubscribeResult!
}

input NewsletterSubscriptionInput {
  email: String!
  name: String
  source: String
}

union NewsletterSubscriptionResult = NewsletterSubscriptionSuccess | NewsletterSubscriptionError

type NewsletterSubscriptionSuccess {
  success: Boolean!
  message: String!
}

type NewsletterSubscriptionError {
  errorCode: String!
  message: String!
}

union NewsletterUnsubscribeResult = NewsletterUnsubscribeSuccess | NewsletterUnsubscribeError

type NewsletterUnsubscribeSuccess {
  success: Boolean!
  message: String!
}

type NewsletterUnsubscribeError {
  errorCode: String!
  message: String!
}
```

### 2. Frontend Hook Development
**File:** `frontend/src/hooks/useNewsletter.ts`

Create a React hook that:
- Manages newsletter subscription state
- Handles form validation
- Provides loading states and error handling
- Integrates with the GraphQL mutations

**Key Features:**
```typescript
interface UseNewsletterReturn {
  subscribe: (email: string, name?: string) => Promise<void>;
  unsubscribe: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}
```

### 3. Newsletter Component Enhancement
**File:** `frontend/src/components/NewsletterForm.tsx`

Build a new component to replace the static form with:
- Input validation (email format, required fields)
- Loading states with spinner
- Success/error feedback messages
- Accessible form design
- Optional name field
- GDPR-compliant unsubscribe option

### 4. Homepage Integration
**File:** `frontend/src/routes/index.tsx` (Line 392)

Replace the existing static newsletter form:
```tsx
// Current static form (around line 392)
<div class="newsletter-section">
  <input type="email" placeholder="Enter your email" />
  <button>Subscribe</button>
</div>

// Replace with:
<NewsletterForm source="homepage-footer" />
```

### 5. Configuration Setup
**Files to Configure:**
- `backend/src/config/sendpulse.config.ts` - SendPulse API credentials
- `.env` files - Environment variables for API keys
- `backend/src/plugins/newsletter/newsletter.plugin.ts` - Plugin configuration

**Environment Variables Needed:**
```env
SENDPULSE_API_USER_ID=your_user_id
SENDPULSE_API_SECRET=your_secret_key
SENDPULSE_TOKEN_STORAGE_PATH=/path/to/token/storage
SENDPULSE_DEFAULT_ADDRESS_BOOK_ID=your_address_book_id
```

## Implementation Order

1. **Newsletter Plugin** - Core backend functionality
2. **GraphQL Integration** - API endpoints for frontend
3. **Frontend Hook** - State management and API calls
4. **Newsletter Component** - User interface
5. **Homepage Integration** - Replace existing form
6. **Configuration** - Environment setup
7. **Testing** - Validate all functionality

## Technical Considerations

### Security
- Input sanitization and validation
- Rate limiting for subscription attempts
- CORS configuration for frontend requests
- Secure token storage for SendPulse API

### Error Handling
- Network timeouts and retries
- SendPulse API error codes mapping
- User-friendly error messages
- Graceful degradation if service is unavailable

### Performance
- Async/await for non-blocking operations
- Caching for SendPulse tokens
- Debounced form submissions
- Loading states for better UX

### GDPR Compliance
- Clear consent messaging
- Easy unsubscribe process
- Data retention policies
- Privacy policy links

## Testing Strategy

### Backend Tests
- Unit tests for SendPulse service methods
- Integration tests for GraphQL resolvers
- Error handling scenarios
- Mock SendPulse API responses

### Frontend Tests
- Component rendering tests
- Form validation tests
- Hook functionality tests
- Error state handling

### End-to-End Tests
- Complete subscription flow
- Error scenarios (invalid email, API failures)
- Unsubscribe functionality
- Cross-browser compatibility

## Files to Create/Modify

### New Files
- `backend/src/plugins/newsletter/newsletter.plugin.ts`
- `backend/src/plugins/newsletter/newsletter.resolver.ts`
- `backend/src/plugins/newsletter/newsletter.types.ts`
- `backend/src/config/sendpulse.config.ts`
- `frontend/src/hooks/useNewsletter.ts`
- `frontend/src/components/NewsletterForm.tsx`
- `backend/src/plugins/newsletter/newsletter.test.ts`
- `frontend/src/components/__tests__/NewsletterForm.test.tsx`

### Files to Modify
- `frontend/src/routes/index.tsx` - Replace static form
- `backend/src/vendure-config.ts` - Register newsletter plugin
- `backend/package.json` - Already updated with dependencies
- `.env` files - Add SendPulse configuration
- `frontend/src/generated/shop-types.ts` - Will be auto-generated

## Ready to Proceed

The SendPulse service foundation is solid. We can now proceed with:
1. Creating the Vendure plugin structure
2. Implementing GraphQL schema and resolvers
3. Building the frontend components
4. Integrating everything together

Would you like me to start with the Newsletter Plugin creation, or would you prefer to begin with a different component?
