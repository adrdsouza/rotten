import { component$, useSignal, useTask$, $ } from '@qwik.dev/core';
import { PaymentError } from '~/services/payment-error-handler';
import XCircleIcon from '../icons/XCircleIcon';
import ExclamationTriangleIcon from '../icons/ExclamationTriangleIcon';
import InformationCircleIcon from '../icons/InformationCircleIcon';

export interface PaymentErrorDisplayProps {
  error: PaymentError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetryButton?: boolean;
  autoRetryCountdown?: number;
}

export default component$<PaymentErrorDisplayProps>((props) => {
  const countdown = useSignal(props.autoRetryCountdown || 0);
  const isRetrying = useSignal(false);

  // Countdown timer for auto-retry
  useTask$(({ track, cleanup }) => {
    track(() => props.autoRetryCountdown);
    
    if (props.autoRetryCountdown && props.autoRetryCountdown > 0) {
      countdown.value = props.autoRetryCountdown;
      
      const timer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
          clearInterval(timer);
          if (props.onRetry && props.error?.isRetryable) {
            props.onRetry();
          }
        }
      }, 1000);
      
      cleanup(() => clearInterval(timer));
    }
  });

  const handleRetry = $(() => {
    if (props.onRetry && !isRetrying.value) {
      isRetrying.value = true;
      props.onRetry();
      // Reset after a delay to prevent double-clicks
      setTimeout(() => {
        isRetrying.value = false;
      }, 2000);
    }
  });

  const handleDismiss = $(() => {
    if (props.onDismiss) {
      props.onDismiss();
    }
  });

  if (!props.error) {
    return null;
  }

  const getIconAndColors = () => {
    switch (props.error?.severity) {
      case 'critical':
      case 'high':
        return {
          icon: <XCircleIcon />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-400',
          titleColor: 'text-red-800',
          textColor: 'text-red-700'
        };
      case 'medium':
        return {
          icon: <ExclamationTriangleIcon />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-400',
          titleColor: 'text-yellow-800',
          textColor: 'text-yellow-700'
        };
      case 'low':
      default:
        return {
          icon: <InformationCircleIcon />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-400',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700'
        };
    }
  };

  const { icon, bgColor, borderColor, iconColor, titleColor, textColor } = getIconAndColors();

  const getTitle = () => {
    switch (props.error?.category) {
      case 'network':
        return 'Connection Problem';
      case 'stripe':
        return 'Payment Service Issue';
      case 'validation':
        return 'Payment Information Issue';
      case 'user':
        return 'Payment Method Issue';
      case 'system':
      default:
        return 'Payment Error';
    }
  };

  return (
    <div class={`rounded-md ${bgColor} ${borderColor} border p-4 mb-4`}>
      <div class="flex">
        <div class="flex-shrink-0">
          <div class={iconColor}>
            {icon}
          </div>
        </div>
        <div class="ml-3 flex-1">
          <h3 class={`text-sm font-medium ${titleColor}`}>
            {getTitle()}
          </h3>
          <div class={`mt-2 text-sm ${textColor}`}>
            <p>{props.error.message}</p>
            
            {props.error.userAction && (
              <p class="mt-1 font-medium">
                What to do: {props.error.userAction}
              </p>
            )}

            {props.error.errorCode && (
              <p class="mt-2 text-xs opacity-75">
                Error Code: {props.error.errorCode}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div class="mt-4 flex flex-wrap gap-2">
            {props.error.isRetryable && props.showRetryButton && (
              <button
                onClick$={handleRetry}
                disabled={isRetrying.value}
                class={`
                  inline-flex items-center px-3 py-2 border border-transparent text-sm 
                  leading-4 font-medium rounded-md focus:outline-none focus:ring-2 
                  focus:ring-offset-2 transition-colors
                  ${props.error.severity === 'critical' || props.error.severity === 'high'
                    ? 'text-red-700 bg-red-100 hover:bg-red-200 focus:ring-red-500'
                    : props.error.severity === 'medium'
                    ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500'
                    : 'text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500'
                  }
                  ${isRetrying.value ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isRetrying.value ? (
                  <>
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Retrying...
                  </>
                ) : countdown.value > 0 ? (
                  `Retry in ${countdown.value}s`
                ) : (
                  'Try Again'
                )}
              </button>
            )}

            {countdown.value > 0 && props.error.isRetryable && (
              <div class={`inline-flex items-center px-3 py-2 text-sm ${textColor}`}>
                Auto-retry in {countdown.value} seconds
              </div>
            )}

            <button
              onClick$={handleDismiss}
              class={`
                inline-flex items-center px-3 py-2 border text-sm leading-4 
                font-medium rounded-md focus:outline-none focus:ring-2 
                focus:ring-offset-2 transition-colors
                ${props.error.severity === 'critical' || props.error.severity === 'high'
                  ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500'
                  : props.error.severity === 'medium'
                  ? 'border-yellow-300 text-yellow-700 bg-white hover:bg-yellow-50 focus:ring-yellow-500'
                  : 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50 focus:ring-blue-500'
                }
              `}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});