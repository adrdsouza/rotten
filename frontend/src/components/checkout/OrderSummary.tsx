import { component$ } from '@builder.io/qwik';
import type { ActiveOrderQuery } from '~/generated/graphql-shop';

export const OrderSummary = component$(({ order }: { order: ActiveOrderQuery['activeOrder'] }) => {
  return (
    <div class="bg-white p-6 shadow-md rounded-lg">
      <h2 class="text-2xl font-bold mb-4">Order Summary</h2>
      <ul>
        {order?.lines.map((line) => (
          <li key={line.id} class="flex justify-between items-center mb-2">
            <div>
              <p class="font-semibold">{line.productVariant.name}</p>
              <p class="text-sm text-gray-600">Quantity: {line.quantity}</p>
            </div>
            <p class="font-semibold">${(line.linePriceWithTax / 100).toFixed(2)}</p>
          </li>
        ))}
      </ul>
      <div class="border-t border-gray-200 mt-4 pt-4">
        <div class="flex justify-between mb-2">
          <p>Subtotal</p>
          <p>${(order?.subTotalWithTax / 100).toFixed(2)}</p>
        </div>
        <div class="flex justify-between mb-2">
          <p>Shipping</p>
          <p>${(order?.shippingWithTax / 100).toFixed(2)}</p>
        </div>
        <div class="flex justify-between font-bold text-lg">
          <p>Total</p>
          <p>${(order?.totalWithTax / 100).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
});