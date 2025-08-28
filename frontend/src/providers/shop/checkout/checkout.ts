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

export const transitionOrderToStateMutation = async (state = 'ArrangingPayment') => {
	const result = await shopSdk.transitionOrderToState({ state });
	
	// Handle the response properly - extract the actual order data
	if (result?.transitionOrderToState) {
		const transitionResult = result.transitionOrderToState;
		
		// Check if it's an error result
		if ('errorCode' in transitionResult) {
			console.error('[transitionOrderToState] Error:', transitionResult.errorCode, transitionResult.message);
			throw new Error(`Order state transition failed: ${transitionResult.message || transitionResult.errorCode}`);
		}
		
		// Return the order if successful
		if ('__typename' in transitionResult && transitionResult.__typename === 'Order') {
			console.log('[transitionOrderToState] Success - Order transitioned to:', transitionResult.state);
			return transitionResult;
		}
	}
	
	throw new Error('Failed to transition order state - unexpected response format');
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
			{ createPreOrderStripePaymentIntent: string },
			{ estimatedTotal: number; currency: string }
		>(
			gql`
				mutation createPreOrderStripePaymentIntent($estimatedTotal: Int!, $currency: String!) {
					createPreOrderStripePaymentIntent(estimatedTotal: $estimatedTotal, currency: $currency)
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
