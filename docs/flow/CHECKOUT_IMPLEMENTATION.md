# Checkout Implementation Documentation

## Overview

This document provides comprehensive documentation for the current checkout implementation in the Rotten Hand storefront. The checkout system has been completely refactored to match the behavior of the old implementation while providing robust validation and comprehensive billing address support.

## Architecture

### Components Structure

```
/src/routes/checkout/index.tsx           # Main checkout page
/src/components/checkout/
├── CheckoutAddresses.tsx                # Primary checkout form component
├── AddressForm.tsx                      # Shipping address form
├── BillingAddressForm.tsx              # Billing address form (when enabled)
/src/components/payment/
├── Payment.tsx                          # Payment coordination component
├── NMI.tsx                             # NMI payment processor
/src/utils/index.ts                     # Validation utilities
```

### Key Dependencies

- **Qwik Framework**: Reactive signals and state management
- **Vendure GraphQL**: Backend order management
- **NMI Payment**: Credit card processing
- **Validation Utilities**: Custom validation functions

## Checkout Flow

### 1. Page Initialization
```typescript
// /src/routes/checkout/index.tsx
useVisibleTask$(async () => {
  appState.showCart = false;
  const actualOrder = await getActiveOrderQuery();
  if (actualOrder?.lines?.length === 0) {
    navigate('/');  // Redirect if cart is empty
  }
  appState.activeOrder = actualOrder;
});
```

### 2. Address Form Validation
The checkout uses real-time reactive validation with the following components:

#### Customer Validation
- **Email**: Required, valid email format
- **First Name**: Required, minimum length
- **Last Name**: Required, minimum length  
- **Phone**: Optional for US/PR, required for other countries

#### Address Validation
- **Shipping Address**: Street, city, state/province, postal code, country
- **Billing Address**: Same validation when "Use different billing address" is enabled

### 3. Auto-Progression Logic
```typescript
// CheckoutAddresses.tsx - useTask$ for reactive validation
useTask$(({ track }) => {
  track(() => appState.customer);
  track(() => appState.shippingAddress);
  track(() => useDifferentBilling.value);
  track(() => appState.billingAddress);
  
  // Trigger validation after 300ms debounce
  validationTimer.value = setTimeout(() => {
    validateCompleteForm$();
  }, 300);
});
```

### 4. Order Submission Flow
```typescript
// Main checkout page - placeOrder function
const placeOrder = $(async () => {
  // 1. Submit address form via global function
  await (window as any).submitCheckoutAddressForm();
  
  // 2. Wait for address submission completion
  // 3. Transition order to ArrangingPayment state
  await transitionOrderToStateMutation('ArrangingPayment');
  
  // 4. Trigger NMI payment processing
  await (paymentTrigger.value as any).trigger();
});
```

### 5. Payment Processing
- NMI handles credit card processing
- On success: Navigate to `/checkout/confirmation/${orderCode}`
- On error: Display error message and reset form state

## Validation System

### Core Validation Functions

Located in `/src/utils/index.ts`:

```typescript
// Customer validation
export const isActiveCustomerValid = (activeCustomer: ActiveCustomer): boolean

// Address validation
export const isShippingAddressValid = (shippingAddress: ShippingAddress): boolean
export const isBillingAddressValid = (billingAddress: ShippingAddress): boolean

// Field-level validation
export const validateEmail = (email: string): ValidationResult
export const validateName = (name: string, fieldName: string): ValidationResult
export const validatePhone = (phone: string, countryCode: string, isOptional?: boolean): ValidationResult
export const validateAddress = (address: string, fieldName: string): ValidationResult
export const validatePostalCode = (postalCode: string, countryCode: string): ValidationResult
```

### Phone Validation Rules

**Critical Implementation Detail:**
- **US and Puerto Rico (PR)**: Phone number is OPTIONAL
- **All other countries**: Phone number is REQUIRED

```typescript
const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
const phoneResult = validatePhone(customerPhoneNumber, countryCode, isPhoneOptional);
```

### Complete Validation Logic

```typescript
const validateCompleteForm$ = $(() => {
  // 1. Customer validation
  const customerValid = isActiveCustomerValid(mergedCustomer);
  
  // 2. Phone validation with country-specific rules
  const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
  const phoneResult = validatePhone(customerPhoneNumber, countryCode, isPhoneOptional);
  const phoneRequirementValid = phoneResult.isValid || isPhoneOptional;
  
  // 3. Shipping address validation
  const shippingAddressValid = isShippingAddressValid(appState.shippingAddress);
  
  // 4. Billing address validation (when enabled)
  let billingAddressValid = true;
  if (useDifferentBilling.value) {
    billingAddressValid = isBillingAddressValid(appState.billingAddress);
  }
  
  // 5. Overall validation
  const overallValid = customerValid && phoneResult.isValid && phoneRequirementValid && 
                      shippingAddressValid && billingAddressValid;
});
```

## Key Features

### ✅ Implemented Features

1. **Comprehensive Validation**
   - Customer information validation
   - Shipping address validation
   - Billing address validation (when enabled)
   - Country-specific phone requirements
   - Inline error display only (matches old implementation)

2. **Reactive State Management**
   - Individual field validation signals
   - Real-time error display
   - Proper error clearing
   - Debounced validation (300ms)

3. **Auto-Progression Safety**
   - Prevents submission with invalid data
   - Multiple validation checkpoints
   - Race condition protection

4. **Billing Address Support**
   - Optional "Use different billing address" checkbox
   - Full validation when enabled
   - Automatic fallback to shipping address when disabled

5. **Error Display**
   - Inline field errors only (matches old implementation)
   - No summary error box
   - Touched field tracking
   - Reactive error clearing with empty strings
   - Comprehensive error logging

### 🔧 Technical Improvements

1. **Performance Optimizations**
   - Debounced validation to prevent excessive API calls
   - Selective reactive tracking
   - Efficient state updates

2. **Code Organization**
   - Modular validation utilities
   - Separated concerns (customer, shipping, billing)
   - Reusable validation functions

3. **Developer Experience**
   - Comprehensive console logging
   - Clear validation state tracking
   - Detailed error messages

## Configuration

### Environment Variables
- NMI payment configuration (handled in Payment/NMI components)
- API endpoints for Vendure backend

### Country Code Logic
```typescript
// Default country selection
const defaultCountryCode = sessionStorage.getItem('userCountry') || 'US';

// Phone requirement logic
const isPhoneOptional = (countryCode: string) => 
  countryCode === 'US' || countryCode === 'PR';
```

## State Management

### App State Structure
```typescript
interface AppState {
  customer: {
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber: string;
  };
  shippingAddress: ShippingAddress;
  billingAddress: ShippingAddress;
  activeOrder: Order;
}
```

### Local Component State
```typescript
// Individual field validation signals
const emailValidationError = useSignal('');
const phoneValidationError = useSignal('');
const firstNameValidationError = useSignal('');
const lastNameValidationError = useSignal('');

// Form state signals
const useDifferentBilling = useSignal(false);
const isReadyToSubmit = useSignal(false);
const hasProceeded = useSignal(false);
```

## Troubleshooting Guide

### Common Issues

#### 1. Phone Validation Errors
**Symptoms**: Phone validation fails for US/PR customers
**Solution**: Ensure `isPhoneOptional` parameter is passed correctly
```typescript
const isPhoneOptional = countryCode === 'US' || countryCode === 'PR';
validatePhone(phoneNumber, countryCode, isPhoneOptional);
```

#### 2. Form Auto-Progression Not Working
**Symptoms**: Form doesn't auto-submit when valid
**Solution**: Check validation signals and overall validation logic
```typescript
// Debug validation state
console.log('[CheckoutAddresses] Validation results:', {
  customerValid,
  phoneValid: phoneResult.isValid,
  phoneRequirementValid,
  shippingAddressValid,
  billingAddressValid,
  overallValid
});
```

#### 3. Billing Address Validation Missing
**Symptoms**: Can submit with invalid billing address
**Solution**: Ensure billing validation is enabled
```typescript
// Check if billing validation is running
if (useDifferentBilling.value) {
  billingAddressValid = isBillingAddressValid(appState.billingAddress);
}
```

#### 4. State Synchronization Issues
**Symptoms**: Frontend shows valid but backend submission fails
**Solution**: Check address submission coordination
```typescript
// Verify window global function exists
if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
  await (window as any).submitCheckoutAddressForm();
}
```

### Debugging Tools

#### 1. Console Logging
The checkout includes comprehensive logging:
- Validation results for each step
- Address submission status
- Payment processing state
- Error conditions

#### 2. Browser Developer Tools
- Check Qwik signals in React DevTools
- Monitor network requests to Vendure backend
- Inspect form state in browser storage

#### 3. Validation State Inspection
```typescript
// Add temporary debugging code
useVisibleTask$(({ track }) => {
  track(() => overallValid.value);
  console.log('Overall validation changed:', overallValid.value);
});
```

## Migration Notes

### Changes from Old Implementation

1. **Separated Forms**: Customer, shipping, and billing are now separate components
2. **Reactive Validation**: Real-time validation with debouncing (300ms for all fields except country changes which are immediate)
3. **Error Handling**: Matches old implementation with inline errors only (no summary box)
4. **Billing Address Support**: Full validation for separate billing addresses (enhancement over old implementation)
5. **Immediate Country Updates**: Country changes trigger instant validation and shipping cost updates

### Breaking Changes

1. **Component Structure**: `CustomerInfoForm` replaced with direct input fields
2. **Validation API**: New validation utility functions
3. **State Coordination**: Uses window globals for cross-component communication

## Maintenance Tasks

### Regular Maintenance

1. **Update Validation Rules**: Modify functions in `/src/utils/index.ts`
2. **Add New Countries**: Update phone requirement logic if needed
3. **Error Message Updates**: Modify validation result messages
4. **UI Improvements**: Update styling and layout in CheckoutAddresses component

### Testing Checklist

- [ ] Customer information validation (all fields)
- [ ] Phone validation for US/PR (optional) vs other countries (required)
- [ ] Shipping address validation (all required fields)
- [ ] Billing address validation when enabled
- [ ] Form auto-progression when valid
- [ ] Error display and clearing
- [ ] Payment processing flow
- [ ] Order confirmation page

## Performance Considerations

1. **Debouncing**: 300ms debounce on validation prevents excessive processing
2. **Selective Tracking**: Only track necessary signals to minimize re-renders
3. **Efficient Updates**: Use empty string assignment for error clearing
4. **Memory Management**: Clear timers and event listeners appropriately

## Security Considerations

1. **Input Validation**: All inputs validated on both frontend and backend
2. **XSS Prevention**: Proper input sanitization
3. **Payment Security**: PCI compliance through NMI integration
4. **Data Protection**: Customer data handled according to privacy requirements

---

## Contact Information

For questions about this implementation, refer to:
- Checkout validation logic: `/src/utils/index.ts`
- Main checkout flow: `/src/routes/checkout/index.tsx`
- Address forms: `/src/components/checkout/CheckoutAddresses.tsx`
- Payment processing: `/src/components/payment/Payment.tsx`

Last Updated: January 2025
Implementation Version: 2.0 (Complete Refactor)
