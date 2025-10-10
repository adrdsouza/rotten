import { component$ } from '@qwik.dev/core';
import type { DocumentHead } from '@qwik.dev/router';
import { OrderTracking } from '~/components/order-tracking';

export default component$(() => {
  return (
    <div class="min-h-screen bg-gray-50 py-12">
      <OrderTracking />
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Track Your Order - Damned Designs',
  meta: [
    {
      name: 'description',
      content: 'Track your Damned Designs order status and shipping information. Enter your order number and email to get real-time updates.',
    },
    {
      name: 'keywords',
      content: 'order tracking, order status, shipping tracking, Damned Designs, EDC, knives, tactical gear',
    },
    {
      property: 'og:title',
      content: 'Track Your Order - Damned Designs',
    },
    {
      property: 'og:description',
      content: 'Track your Damned Designs order status and shipping information. Enter your order number and email to get real-time updates.',
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      name: 'twitter:card',
      content: 'summary',
    },
    {
      name: 'twitter:title',
      content: 'Track Your Order - Damned Designs',
    },
    {
      name: 'twitter:description',
      content: 'Track your Damned Designs order status and shipping information.',
    },
  ],
};