export function useCheckoutSeo() {
  // Checkout page works with local cart - no order code until place order
  return {
    title: 'Checkout - Complete Your Purchase',
    meta: [
      {
        name: 'description',
        content: 'Complete your purchase',
      },
    ],
  };
}