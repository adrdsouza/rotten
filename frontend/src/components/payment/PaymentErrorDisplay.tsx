import { component$ } from '@qwik.dev/core';
import { PaymentError } from '~/services/payment-error-handler';
import XCircleIcon from '../icons/XCircleIcon';

interface PaymentErrorDisplayProps {
  error: PaymentError;
  isRetrying?: boolean;
}

export const PaymentErrorDisplay = component$<PaymentErrorDisplayProps>((props) => {
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
        </div>
      </div>
    </div>
  );
});
