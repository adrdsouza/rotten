import { component$ } from '@builder.io/qwik';
import type { OrderAddress } from '~/generated/graphql-shop';

export const BillingAddress = component$(({ address }: { address: OrderAddress | null | undefined }) => {
  return (
    <div class="bg-white p-6 shadow-md rounded-lg">
      <h2 class="text-2xl font-bold mb-4">Billing Address</h2>
      {address ? (
        <div>
          <p>{address.fullName}</p>
          <p>{address.streetLine1}</p>
          {address.streetLine2 && <p>{address.streetLine2}</p>}
          <p>
            {address.city}, {address.province} {address.postalCode}
          </p>
          <p>{address.countryCode}</p>
          <p>{address.phoneNumber}</p>
        </div>
      ) : (
        <p>No billing address set.</p>
      )}
    </div>
  );
});