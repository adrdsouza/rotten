import { component$, useSignal, useVisibleTask$, type QRL } from '@qwik.dev/core';

interface PaymentProps {
  onPaymentMethodSelect$: QRL<(id: string) => void>;
  onPaymentNonceGenerate$: QRL<(nonce: string) => void>;
}

export const Payment = component$<PaymentProps>(
  ({ onPaymentMethodSelect$, onPaymentNonceGenerate$ }) => {
    const dropinInstance = useSignal<any>();

    useVisibleTask$(() => {
      const script = document.createElement('script');
      script.src =
        'https://js.braintreegateway.com/web/dropin/1.33.7/js/dropin.min.js';
      script.async = true;
      document.head.appendChild(script);

      script.onload = () => {
        window.braintree.dropin.create(
          {
            authorization: 'sandbox_g42y39zw_348pk9cgf3bgyw2b', // Use a client token from your server in production
            container: '#dropin-container',
          },
          (err: any, instance: any) => {
            if (err) {
              console.error(err);
              return;
            }
            dropinInstance.value = instance;
          },
        );
      };
    });

    return (
      <div class="bg-white p-6 shadow-md rounded-lg">
        <h2 class="text-xl font-semibold mb-4">Payment</h2>
        <div id="dropin-container"></div>
        <button
          class="w-full bg-blue-500 text-white py-2 rounded-md mt-4 hover:bg-blue-600"
          onClick$={async () => {
            if (dropinInstance.value) {
              const { nonce, type } =
                await dropinInstance.value.requestPaymentMethod();
              await onPaymentMethodSelect$(type);
              await onPaymentNonceGenerate$(nonce);
            }
          }}
        >
          Confirm Payment Method
        </button>
      </div>
    );
  },
);