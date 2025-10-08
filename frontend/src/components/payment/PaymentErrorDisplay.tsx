import { component$, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { PaymentError } from '~/services/payment-error-handler';
import XCircleIcon from '../icons/XCircleIcon';

interface PaymentErrorDisplayProps {
  error: PaymentError;
  isRetrying?: boolean;
}

export const PaymentErrorDisplay = component$<PaymentErrorDisplayProps>((props) => {
  const countdown = useSignal(3);
  const isRefreshing = useSignal(false);

  // Check if this is a page refresh error message
  const isPageRefreshError = props.error.message.includes('Refreshing page for retry');

  useVisibleTask$(({ cleanup }) => {
    if (isPageRefreshError) {
      isRefreshing.value = true;
      const timer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
          clearInterval(timer);
        }
      }, 1000);

      cleanup(() => clearInterval(timer));
    }
  });

  return (
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          <XCircleIcon forcedClass="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3 flex-1">
          <h3 class="text-sm font-medium text-red-800">
            Payment Error
          </h3>
          <div class="mt-2 text-sm text-red-700">
            <p>{props.error.message}</p>
            {props.error.errorCode && (
              <p class="mt-1 text-xs text-red-600">
                Error Code: {props.error.errorCode}
              </p>
            )}
          </div>

          {props.isRetrying && (
            <div class="mt-3 text-sm text-red-600">
              <p>Retrying payment...</p>
            </div>
          )}

          {isRefreshing.value && countdown.value > 0 && (
            <div class="mt-3 text-sm text-red-600">
              <p>Refreshing page in {countdown.value} seconds...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
