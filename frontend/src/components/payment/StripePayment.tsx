import { $, component$, noSerialize, useContext, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import { Stripe, StripeElements, loadStripe } from '@stripe/stripe-js';
import { APP_STATE } from '~/constants';
import { createStripePaymentIntentMutation } from '~/providers/shop/checkout/checkout';


import CreditCardIcon from '../icons/CreditCardIcon';
import XCircleIcon from '../icons/XCircleIcon';

let _stripe: Promise<Stripe | null>;
function getStripe(publishableKey: string) {
	if (!_stripe && publishableKey) {
		_stripe = loadStripe(publishableKey);
	}
	return _stripe;
}
const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('[StripePayment] Using Stripe key:', stripeKey);
const stripePromise = getStripe(stripeKey);

export default component$(() => {
	const appState = useContext(APP_STATE);
	const baseUrl = useLocation().url.origin;
	const store = useStore({
		clientSecret: '',
		resolvedStripe: noSerialize({} as Stripe),
		stripeElements: noSerialize({} as StripeElements),
		error: '',
	});

	useVisibleTask$(async () => {
		// Calculate amount from local cart (like coupon validation) or use active order
		let amount = 0;

		if (appState.activeOrder?.totalWithTax) {
			// Vendure order exists - use its total
			amount = appState.activeOrder.totalWithTax;
		} else {
			// Local cart mode - calculate total from cart context
			// This is the same pattern as your coupon validation
			const localCart = (window as any).localCartContext || { localCart: { subTotal: 0 } };
			const cartSubtotal = localCart.localCart?.subTotal || 0;
			const shippingFee = 2000; // $20.00 - you'd get this from your shipping calculation
			amount = cartSubtotal + shippingFee;
		}

		console.log('[StripePayment] Creating payment intent for amount:', amount);

		try {
			store.clientSecret = await createStripePaymentIntentMutation(amount);
		} catch (error) {
			console.error('[StripePayment] Failed to create payment intent:', error);
			store.error = 'Failed to initialize payment. Please try again.';
			return;
		}

		await stripePromise.then((stripe) => {
			store.resolvedStripe = noSerialize(stripe as Stripe);
			store.stripeElements = noSerialize(stripe?.elements({
				clientSecret: store.clientSecret,
				locale: 'pt',
				// Configure which payment methods to show
				appearance: {
					theme: 'stripe',
					variables: {
						colorPrimary: '#eee9d4',
						colorBackground: '#ffffff',
						colorText: '#374151',
						colorDanger: '#ef4444',
						colorSuccess: '#10b981',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						spacingUnit: '4px',
						borderRadius: '6px',
						fontSizeBase: '16px',
						fontWeightNormal: '400',
						fontWeightBold: '500',
						focusBoxShadow: '0 0 0 2px rgba(176, 153, 131, 0.2)',
						focusOutline: 'none',
					},
					rules: {
						// Force full width for the entire payment element
						'.PaymentElement': {
							width: '100%',
							maxWidth: '100%',
						},
						'.Tabs': {
							width: '100%',
							maxWidth: '100%',
						},
						// Tab styling for Stripe's native tabs layout
						'.Tab': {
							border: '1px solid #e5e7eb',
							borderRadius: '8px 8px 0 0',
							backgroundColor: '#f9fafb',
							padding: '12px 16px',
							fontWeight: '500',
							fontSize: '14px',
							color: '#374151',
							transition: 'all 0.2s ease',
							cursor: 'pointer',
							marginRight: '2px',
						},
						'.Tab:hover': {
							backgroundColor: '#f3f4f6',
							borderColor: '#eee9d4',
						},
						'.Tab--selected': {
							backgroundColor: '#ffffff',
							borderColor: '#eee9d4',
							borderBottomColor: '#ffffff',
							color: '#eee9d4',
							fontWeight: '600',
							position: 'relative',
							zIndex: '10',
						},
						'.Tab--selected:hover': {
							backgroundColor: '#ffffff',
						},
						'.TabContent': {
							backgroundColor: '#ffffff',
							border: '1px solid #eee9d4',
							borderTop: 'none',
							borderRadius: '0 8px 8px 8px',
							padding: '20px',
							marginTop: '-1px',
							width: '100%',
							maxWidth: '100%',
							boxSizing: 'border-box',
						},
						'.Input': {
							borderRadius: '6px',
							border: '1px solid #d1d5db',
							padding: '12px 16px',
							fontSize: '16px',
							backgroundColor: '#ffffff',
							transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out',
						},
						'.Input:hover': {
							borderColor: '#9ca3af',
						},
						'.Input:focus': {
							borderColor: '#eee9d4',
							boxShadow: '0 0 0 2px rgba(176, 153, 131, 0.2)',
							outline: 'none',
						},
						'.Input--invalid': {
							borderColor: '#ef4444',
							boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.2)',
						},
						'.Label': {
							fontSize: '14px',
							fontWeight: '500',
							color: '#374151',
							marginBottom: '6px',
						},
						'.Error': {
							fontSize: '14px',
							color: '#ef4444',
							marginTop: '6px',
						}
					}
				}
			}));

			// Create payment element with tabs layout
			store.stripeElements?.create('payment', {
				layout: {
					type: 'tabs',
					defaultCollapsed: false
				},
				fields: {
					billingDetails: {
						name: 'auto',
						email: 'auto',
						phone: 'auto',
						address: {
							country: 'auto',
							line1: 'auto',
							line2: 'auto',
							city: 'auto',
							state: 'auto',
							postalCode: 'auto',
						}
					}
				}
			}).mount('#payment-form');
		});
	});

	return (
		<div class="w-full max-w-full">
			<div class="payment-tabs-container relative">
				<div id="payment-form" class="mb-8 w-full max-w-full"></div>
			</div>
			{store.error !== '' && (
				<div class="rounded-md bg-red-50 p-4 mb-8">
					<div class="flex">
						<div class="flex-shrink-0">
							<XCircleIcon />
						</div>
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">We ran into a problem with payment!</h3>
							<p class="text-sm text-red-700 mt-2">{store.error}</p>
						</div>
					</div>
				</div>
			)}

			<button
				class="w-full flex px-6 bg-[#eee9d4] hover:bg-[#4F3B26] items-center justify-center space-x-2 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#eee9d4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
				disabled={!store.clientSecret || !!store.error}
				onClick$={$(async () => {
					const result = await store.stripeElements?.submit();
					if (!result?.error) {
						const result = await store.resolvedStripe?.confirmPayment({
							elements: store.stripeElements,
							clientSecret: store.clientSecret,
							confirmParams: {
								return_url: `${baseUrl}/checkout/confirmation/${appState.activeOrder?.code}`,
							},
						});
						if (result?.error) {
							store.error = result.error.message as string;
						}
					} else {
						store.error = result.error.message as string;
					}
				})}
			>
				<CreditCardIcon />
				<span>Place Order</span>
			</button>
		</div>
	);
});
