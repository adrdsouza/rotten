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
	console.log(`🔄 Attempting to transition order to state: ${state}`);

	try {
		const result = await shopSdk.transitionOrderToState({ state });
		console.log('🔄 Raw GraphQL result:', JSON.stringify(result, null, 2));

		// Check if the result contains an error
		if (result.transitionOrderToState && 'errorCode' in result.transitionOrderToState) {
			const error = result.transitionOrderToState;
			console.error('❌ Order state transition failed:', error);
			throw new Error(`Order state transition failed: ${error.message} (${error.errorCode})`);
		}

		// Check if we got a successful order back
		if (result.transitionOrderToState && 'state' in result.transitionOrderToState) {
			console.log(`✅ Order state transition successful. New state: ${result.transitionOrderToState.state}`);
			return result;
		}

		// If we get here, something unexpected happened
		console.error('❌ Unexpected transition response:', result);
		throw new Error('Unexpected response from order state transition');
	} catch (error) {
		console.error('❌ Error during order state transition:', error);
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
