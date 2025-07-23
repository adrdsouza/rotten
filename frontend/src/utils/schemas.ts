import { z } from 'zod';
import { validateEmail, validatePhone, validatePostalCode, validateName } from './validation';

// Enhanced address schema with comprehensive validation
export const enhancedAddressSchema = z.object({
  fullName: z.string()
    .min(1, 'Full name is required')
    .refine((name) => validateName(name, 'Full name').isValid, {
      message: 'Please enter a valid full name'
    }),
  
  company: z.string().optional(),
  
  streetLine1: z.string()
    .min(1, 'Street address is required')
    .max(100, 'Street address is too long'),
  
  streetLine2: z.string().optional(),
  
  city: z.string()
    .min(1, 'City is required')
    .refine((city) => validateName(city, 'City').isValid, {
      message: 'Please enter a valid city name'
    }),
  
  province: z.string()
    .min(1, 'State/Province is required'),
  
  postalCode: z.string()
    .min(1, 'Postal code is required'),
  
  countryCode: z.string()
    .min(1, 'Country is required'),
  
  phoneNumber: z.string()
    .min(1, 'Phone number is required'),
  
  defaultShippingAddress: z.boolean().optional(),
  defaultBillingAddress: z.boolean().optional(),
}).refine((data) => {
  // Validate postal code based on country
  const postalResult = validatePostalCode(data.postalCode, data.countryCode);
  return postalResult.isValid;
}, {
  message: 'Invalid postal code format for selected country',
  path: ['postalCode']
}).refine((data) => {
  // Validate phone number based on country
  const phoneResult = validatePhone(data.phoneNumber, data.countryCode);
  return phoneResult.isValid;
}, {
  message: 'Invalid phone number format for selected country',
  path: ['phoneNumber']
});

// Enhanced customer registration schema
export const customerRegistrationSchema = z.object({
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', '']).optional(),
  
  firstName: z.string()
    .min(1, 'First name is required')
    .refine((name) => validateName(name, 'First name').isValid, {
      message: 'Please enter a valid first name'
    }),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .refine((name) => validateName(name, 'Last name').isValid, {
      message: 'Please enter a valid last name'
    }),
  
  emailAddress: z.string()
    .min(1, 'Email is required')
    .refine((email) => validateEmail(email).isValid, {
      message: 'Please enter a valid email address'
    }),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine((password) => /[A-Z]/.test(password), {
      message: 'Password must contain at least one uppercase letter'
    })
    .refine((password) => /[a-z]/.test(password), {
      message: 'Password must contain at least one lowercase letter'
    })
    .refine((password) => /\d/.test(password), {
      message: 'Password must contain at least one number'
    })
    .refine((password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), {
      message: 'Password must contain at least one special character'
    }),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
  
  phoneNumber: z.string().optional(),
  
  dateOfBirth: z.string().optional()
    .refine((date) => {
      if (!date) return true;
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, {
      message: 'You must be between 13 and 120 years old'
    }),
  
  acceptTerms: z.boolean()
    .refine((val) => val === true, {
      message: 'You must accept the terms and conditions'
    }),
  
  marketingOptIn: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .refine((name) => validateName(name).isValid, {
      message: 'Please enter a valid name'
    }),
  
  email: z.string()
    .min(1, 'Email is required')
    .refine((email) => validateEmail(email).isValid, {
      message: 'Please enter a valid email address'
    }),
  
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject is too long'),
  
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(1000, 'Message is too long'),
  
  phone: z.string().optional(),
  
  orderNumber: z.string().optional()
    .refine((orderNumber) => {
      if (!orderNumber) return true;
      return /^[A-Z0-9]{6,20}$/.test(orderNumber);
    }, {
      message: 'Please enter a valid order number'
    })
});

// Checkout validation schema
export const checkoutValidationSchema = z.object({
  shippingAddress: enhancedAddressSchema,
  billingAddress: enhancedAddressSchema.optional(),
  useSameAddress: z.boolean().optional(),
  shippingMethod: z.string().min(1, 'Please select a shipping method'),
  paymentMethod: z.string().min(1, 'Please select a payment method'),
  specialInstructions: z.string().max(500, 'Special instructions are too long').optional(),
  giftWrap: z.boolean().optional(),
  giftMessage: z.string().max(200, 'Gift message is too long').optional()
});

export type EnhancedAddress = z.infer<typeof enhancedAddressSchema>;
export type CustomerRegistration = z.infer<typeof customerRegistrationSchema>;
export type ContactForm = z.infer<typeof contactFormSchema>;
export type CheckoutValidation = z.infer<typeof checkoutValidationSchema>;
