import { useCheckoutLoader } from '~/routes/checkout';

export function useCheckoutSeo() {
  const loader = useCheckoutLoader();
  return {
    title: `Checkout - ${loader.value.order?.code || 'Empty Cart'}`,
    meta: [
      {
        name: 'description',
        content: 'Complete your purchase',
      },
    ],
  };
}