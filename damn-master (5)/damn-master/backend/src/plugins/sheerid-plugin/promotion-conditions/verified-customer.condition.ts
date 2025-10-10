import { LanguageCode, PromotionCondition } from '@vendure/core';

export const verifiedCustomerCondition = new PromotionCondition({
  description: [
    { languageCode: LanguageCode.en, value: 'Customer has verified status' },
  ],
  code: 'verified_customer',
  args: {
    categories: {
      type: 'string',
      list: true,
      ui: {
        component: 'select-form-input',
        options: [
          { value: 'military', label: [{ languageCode: LanguageCode.en, value: 'Military' }] },
          { value: 'first_responder', label: [{ languageCode: LanguageCode.en, value: 'First Responder' }] },
          { value: 'teacher', label: [{ languageCode: LanguageCode.en, value: 'Teacher' }] },
          { value: 'student', label: [{ languageCode: LanguageCode.en, value: 'Student' }] },
          { value: 'medical', label: [{ languageCode: LanguageCode.en, value: 'Medical' }] },
          { value: 'senior', label: [{ languageCode: LanguageCode.en, value: 'Senior' }] }
        ]
      },
      label: [{ languageCode: LanguageCode.en, value: 'Verification Categories' }],
      description: [
        {
          languageCode: LanguageCode.en,
          value: 'Select the verification categories that qualify for this promotion',
        },
      ],
    },
  },
  check: async (ctx, order, args) => {
    const customer = order.customer;
    if (!customer) {
      return false;
    }

    const activeVerifications: string[] = (customer.customFields as any)?.activeVerifications || [];
    
    // Check if customer has any of the required verification categories
    const requiredCategories = args.categories || [];
    return requiredCategories.some((category: string) => 
      activeVerifications.includes(category)
    );
  },
});
