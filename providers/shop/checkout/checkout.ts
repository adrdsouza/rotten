import gql from 'graphql-tag';
import {
	AddPaymentToOrderMutation,
	Order,
	PaymentInput,
} from '~/generated/graphql';
import { shopSdk } from '~/graphql-wrapper';
import { CountryService } from '~/services/CountryService';
import { ShippingService } from '~/services/ShippingService';
import { PaymentService } from '~/services/PaymentService';

// 🚀 CHECKOUT QUERY CACHE - Conservative 2-minute cache for checkout data
const checkoutCache = new Map<string, { data: any; timestamp: number }>();
const CHECKOUT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (conservative for checkout)

const getCachedCheckoutQuery = (key: string) => {
	const cached = checkoutCache.get(key);
	if (cached && Date.now() - cached.timestamp < CHECKOUT_CACHE_DURATION) {
		return cached.data;
	}
	return null;
};

const setCachedCheckoutQuery = (key: string, data: any) => {
	checkoutCache.set(key, { data, timestamp: Date.now() });
	// Keep checkout cache small
	if (checkoutCache.size > 20) {
		const oldestKey = checkoutCache.keys().next().value;
		if (oldestKey) {
			checkoutCache.delete(oldestKey);
		}
	}
};

export const getAvailableCountriesQuery = async () => {
	return await CountryService.getAvailableCountries();
};

export const addPaymentToOrderMutation = async (
	input: PaymentInput = { method: 'standard-payment', metadata: {} }
) => {
	return shopSdk
		.addPaymentToOrder({ input })
		.then((res: AddPaymentToOrderMutation) => res.addPaymentToOrder as Order);
};

export const transitionOrderToStateMutation = async (state: string = 'ArrangingPayment') => {
	console.log(`[transitionOrderToStateMutation] Attempting to transition order to state: ${state}`);
	
	try {
		// First, get the current order state to validate the transition
		const { getActiveOrderQuery } = await import('~/providers/shop/orders/order');
		const currentOrder = await getActiveOrderQuery();
		if (!currentOrder) {
			const error = new Error('No active order found. Cannot transition order state.');
			console.error('[transitionOrderToStateMutation]', error.message);
			throw error;
		}

		console.log(`[transitionOrderToStateMutation] Current order state: ${currentOrder.state}, Target state: ${state}`);

		// Pre-transition state validation
		if (currentOrder.state === state) {
			console.log(`[transitionOrderToStateMutation] Order is already in ${state} state, skipping transition`);
			return { transitionOrderToState: currentOrder };
		}

		// Prevent invalid transitions
		const invalidTransitions = [
			{ from: 'PaymentSettled', to: 'ArrangingPayment', reason: 'Cannot return to payment arrangement after payment is settled' },
			{ from: 'PaymentAuthorized', to: 'AddingItems', reason: 'Cannot add items after payment authorization' },
			{ from: 'Shipped', to: 'ArrangingPayment', reason: 'Cannot arrange payment for shipped orders' },
			{ from: 'Delivered', to: 'ArrangingPayment', reason: 'Cannot arrange payment for delivered orders' },
			{ from: 'Cancelled', to: 'ArrangingPayment', reason: 'Cannot arrange payment for cancelled orders' }
		];

		const invalidTransition = invalidTransitions.find(
			transition => transition.from === currentOrder.state && transition.to === state
		);

		if (invalidTransition) {
			const error = new Error(`Invalid order state transition: ${invalidTransition.reason}. Current state: ${currentOrder.state}, Target state: ${state}`);
			console.error('[transitionOrderToStateMutation]', error.message);
			throw error;
		}

		// Proceed with the transition
		const result = await shopSdk.transitionOrderToState({ state });
		
		if (result.transitionOrderToState && '__typename' in result.transitionOrderToState) {
			if (result.transitionOrderToState.__typename === 'Order') {
				console.log(`[transitionOrderToStateMutation] Successfully transitioned order to ${state} state`);
				return result;
			} else {
				// Handle GraphQL errors
				const errorResult = result.transitionOrderToState as any;
				const errorMessage = `Order state transition failed: ${errorResult.message || errorResult.errorCode || 'Unknown error'}`;
				console.error('[transitionOrderToStateMutation]', errorMessage, {
					currentState: currentOrder.state,
					targetState: state,
					errorType: errorResult.__typename,
					errorDetails: errorResult
				});
				throw new Error(errorMessage);
			}
		} else {
			const error = new Error(`Unexpected response from order state transition. Expected Order or error result, got: ${JSON.stringify(result)}`);
			console.error('[transitionOrderToStateMutation]', error.message);
			throw error;
		}
	} catch (error) {
		// Enhanced error logging with context
		const errorMessage = error instanceof Error ? error.message : 'Unknown error during order state transition';
		console.error('[transitionOrderToStateMutation] Error details:', {
			targetState: state,
			error: errorMessage,
			stack: error instanceof Error ? error.stack : undefined,
			timestamp: new Date().toISOString()
		});
		throw error;
	}
};

export const getEligibleShippingMethodsQuery = async (countryCode: string, subtotal: number) => {
	return ShippingService.getEligibleShippingMethods(countryCode, subtotal);
};

export const getEligiblePaymentMethodsQuery = async () => {
	return PaymentService.getPaymentMethods();
};

// Stripe Payment Integration using official @vendure/payments-plugin
export const createStripePaymentIntentMutation = async () => {
	try {
		const { requester } = await import('~/utils/api');
		const result = await requester<
			{ createStripePaymentIntent: string },
			{}
		>(
			gql`
				mutation createStripePaymentIntent {
					createStripePaymentIntent
				}
			`
		);
		return result.createStripePaymentIntent;
	} catch (error) {
		console.error('Failed to create Stripe payment intent:', error);
		throw error;
	}
};

// New Pre-Order Stripe PaymentIntent Mutations

export const createPreOrderStripePaymentIntentMutation = async (
	estimatedTotal: number,
	currency: string = 'usd'
) => {
	try {
		const { requester } = await import('~/utils/api');
		const result = await requester<
			{ createPreOrderStripePaymentIntent: { clientSecret: string; paymentIntentId: string; amount: number; currency: string } },
			{ estimatedTotal: number; currency: string }
		>(
			gql`
				mutation createPreOrderStripePaymentIntent($estimatedTotal: Int!, $currency: String!) {
					createPreOrderStripePaymentIntent(estimatedTotal: $estimatedTotal, currency: $currency) {
						clientSecret
						paymentIntentId
						amount
						currency
					}
				}
			`,
			{ estimatedTotal, currency }
		);
		return result.createPreOrderStripePaymentIntent;
	} catch (error) {
		console.error('Failed to create pre-order Stripe payment intent:', error);
		throw error;
	}
};

export const linkPaymentIntentToOrderMutation = async (
	paymentIntentId: string,
	orderId: string,
	orderCode: string,
	finalTotal: number,
	customerEmail?: string
) => {
	try {
		const { requester } = await import('~/utils/api');
		const result = await requester<
			{ linkPaymentIntentToOrder: boolean },
			{ paymentIntentId: string; orderId: string; orderCode: string; finalTotal: number; customerEmail?: string }
		>(
			gql`
				mutation linkPaymentIntentToOrder(
					$paymentIntentId: String!,
					$orderId: String!,
					$orderCode: String!,
					$finalTotal: Int!,
					$customerEmail: String
				) {
					linkPaymentIntentToOrder(
						paymentIntentId: $paymentIntentId,
						orderId: $orderId,
						orderCode: $orderCode,
						finalTotal: $finalTotal,
						customerEmail: $customerEmail
					)
				}
			`,
			{ paymentIntentId, orderId, orderCode, finalTotal, customerEmail }
		);
		return result.linkPaymentIntentToOrder;
	} catch (error) {
		console.error('Failed to link payment intent to order:', error);
		throw error;
	}
};

export const settleStripePaymentMutation = async (
	paymentIntentId: string
) => {
	try {
		const { requester } = await import('~/utils/api');
		const result = await requester<
			{ settleStripePayment: { success: boolean; orderId: string; orderCode: string; paymentId?: string; error?: string } },
			{ paymentIntentId: string }
		>(
			gql`
				mutation settleStripePayment($paymentIntentId: String!) {
					settleStripePayment(paymentIntentId: $paymentIntentId) {
						success
						orderId
						orderCode
						paymentId
						error
					}
				}
			`,
			{ paymentIntentId }
		);
		return result.settleStripePayment;
	} catch (error) {
		console.error('Failed to settle Stripe payment:', error);
		throw error;
	}
};

export const calculateEstimatedTotalQuery = async (cartItems: Array<{
	productVariantId: string;
	quantity: number;
	unitPrice: number;
}>) => {
	try {
		const { requester } = await import('~/utils/api');
		const result = await requester<
			{ calculateEstimatedTotal: number },
			{ cartItems: Array<{ productVariantId: string; quantity: number; unitPrice: number }> }
		>(
			gql`
				query calculateEstimatedTotal($cartItems: [PreOrderCartItemInput!]!) {
					calculateEstimatedTotal(cartItems: $cartItems)
				}
			`,
			{ cartItems }
		);
		return result.calculateEstimatedTotal;
	} catch (error) {
		console.error('Failed to calculate estimated total:', error);
		throw error;
	}
};

export const getStripePublishableKeyQuery = async () => {
	// The official plugin doesn't provide a query for the publishable key
	// So we use the environment variable directly
	return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
};

// 🚀 CACHED CHECKOUT QUERIES - Conservative caching for better performance

export const getAvailableCountriesCached = async () => {
	const cacheKey = 'available-countries';
	const cached = getCachedCheckoutQuery(cacheKey);
	if (cached) return cached;

	try {
		const result = await getAvailableCountriesQuery();
		setCachedCheckoutQuery(cacheKey, result);
		return result;
	} catch (error) {
		console.warn('Countries cache failed, using fallback:', error);
		const result = await getAvailableCountriesQuery();
		setCachedCheckoutQuery(cacheKey, result);
		return result;
	}
};

export const getEligibleShippingMethodsCached = async (countryCode: string, subtotal: number) => {
	const cacheKey = `eligible-shipping-methods-${countryCode}-${subtotal}`;
	const cached = getCachedCheckoutQuery(cacheKey);
	if (cached) return cached;

	try {
		const result = await getEligibleShippingMethodsQuery(countryCode, subtotal);
		setCachedCheckoutQuery(cacheKey, result);
		return result;
	} catch (error) {
		console.warn('Shipping methods cache failed, using fallback:', error);
		const result = await getEligibleShippingMethodsQuery(countryCode, subtotal);
		setCachedCheckoutQuery(cacheKey, result);
		return result;
	}
};

export const getEligiblePaymentMethodsCached = async () => {
	const cacheKey = 'eligible-payment-methods';
	const cached = getCachedCheckoutQuery(cacheKey);
	if (cached) return cached;

	try {
		const result = await getEligiblePaymentMethodsQuery();
		setCachedCheckoutQuery(cacheKey, result);
		return result;
	} catch (error) {
		console.warn('Payment methods cache failed, using fallback:', error);
		const result = await getEligiblePaymentMethodsQuery();
		setCachedCheckoutQuery(cacheKey, result);
		return result;
	}
};
