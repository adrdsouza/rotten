import { component$ } from '@qwik.dev/core';
import XCircleIcon from '../icons/XCircleIcon';

interface PaymentErrorDisplayProps {
    error: string;
    errorCode?: string;
    isRetryable?: boolean;
    requiresUserAction?: boolean;
    requiresPageRefresh?: boolean;
    onRetry?: () => void;
    onRefresh?: () => void;
}

/**
 * Enhanced payment error display component with actionable feedback
 */
export default component$<PaymentErrorDisplayProps>((props) => {
    const getErrorSeverity = () => {
        if (props.requiresPageRefresh) return 'warning';
        if (props.requiresUserAction) return 'info';
        if (props.isRetryable) return 'warning';
        return 'error';
    };

    const getSeverityClasses = () => {
        const severity = getErrorSeverity();
        switch (severity) {
            case 'error':
                return {
                    container: 'bg-red-50 border-red-200',
                    icon: 'text-red-400',
                    title: 'text-red-800',
                    message: 'text-red-700',
                    button: 'bg-red-600 hover:bg-red-700 text-white'
                };
            case 'warning':
                return {
                    container: 'bg-yellow-50 border-yellow-200',
                    icon: 'text-yellow-400',
                    title: 'text-yellow-800',
                    message: 'text-yellow-700',
                    button: 'bg-yellow-600 hover:bg-yellow-700 text-white'
                };
            case 'info':
                return {
                    container: 'bg-blue-50 border-blue-200',
                    icon: 'text-blue-400',
                    title: 'text-blue-800',
                    message: 'text-blue-700',
                    button: 'bg-blue-600 hover:bg-blue-700 text-white'
                };
            default:
                return {
                    container: 'bg-red-50 border-red-200',
                    icon: 'text-red-400',
                    title: 'text-red-800',
                    message: 'text-red-700',
                    button: 'bg-red-600 hover:bg-red-700 text-white'
                };
        }
    };

    const getErrorTitle = () => {
        if (props.requiresUserAction) return 'Action Required';
        if (props.requiresPageRefresh) return 'Page Refresh Needed';
        if (props.isRetryable) return 'Temporary Issue';
        return 'Payment Error';
    };

    const getActionButton = () => {
        if (props.requiresPageRefresh && props.onRefresh) {
            return {
                text: 'Refresh Page',
                action: props.onRefresh
            };
        }
        
        if (props.isRetryable && props.onRetry) {
            return {
                text: 'Try Again',
                action: props.onRetry
            };
        }
        
        return null;
    };

    const classes = getSeverityClasses();
    const actionButton = getActionButton();

    return (
        <div class={`rounded-md border p-4 mb-4 ${classes.container}`}>
            <div class="flex">
                <div class="flex-shrink-0">
                    <div class={`w-5 h-5 ${classes.icon}`}>
                        <XCircleIcon />
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h3 class={`text-sm font-medium ${classes.title}`}>
                        {getErrorTitle()}
                    </h3>
                    <div class={`mt-2 text-sm ${classes.message}`}>
                        <p>{props.error}</p>
                        
                        {/* Additional context based on error type */}
                        {props.requiresUserAction && (
                            <p class="mt-2 text-xs">
                                Please complete any required verification steps in your payment method.
                            </p>
                        )}
                        
                        {props.requiresPageRefresh && (
                            <p class="mt-2 text-xs">
                                This usually resolves temporary synchronization issues.
                            </p>
                        )}
                        
                        {props.isRetryable && !props.requiresUserAction && !props.requiresPageRefresh && (
                            <p class="mt-2 text-xs">
                                This appears to be a temporary issue. Please try again.
                            </p>
                        )}
                        
                        {/* Error code for debugging */}
                        {props.errorCode && (
                            <p class="mt-2 text-xs opacity-75">
                                Error Code: {props.errorCode}
                            </p>
                        )}
                    </div>
                    
                    {/* Action button */}
                    {actionButton && (
                        <div class="mt-4">
                            <button
                                type="button"
                                class={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${classes.button} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50`}
                                onClick$={actionButton.action}
                            >
                                {actionButton.text}
                            </button>
                        </div>
                    )}
                    
                    {/* Contact support message for non-actionable errors */}
                    {!actionButton && !props.requiresUserAction && (
                        <div class="mt-3 text-xs opacity-75">
                            If this problem persists, please contact our support team.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

/**
 * Helper function to extract error information for display
 */
export function extractErrorDisplayInfo(error: any): {
    message: string;
    errorCode?: string;
    isRetryable: boolean;
    requiresUserAction: boolean;
    requiresPageRefresh: boolean;
} {
    if (!error) {
        return {
            message: 'An unknown error occurred',
            isRetryable: false,
            requiresUserAction: false,
            requiresPageRefresh: false
        };
    }

    // Extract from enhanced error object
    if (typeof error === 'object' && error.message) {
        return {
            message: error.message,
            errorCode: error.errorCode,
            isRetryable: error.isRetryable ?? false,
            requiresUserAction: error.requiresUserAction ?? false,
            requiresPageRefresh: error.requiresPageRefresh ?? false
        };
    }

    // Fallback to string message
    const message = error.toString();
    
    return {
        message,
        isRetryable: message.toLowerCase().includes('try again'),
        requiresUserAction: message.toLowerCase().includes('verification') || 
                          message.toLowerCase().includes('complete') ||
                          message.toLowerCase().includes('action required'),
        requiresPageRefresh: message.toLowerCase().includes('refresh')
    };
}