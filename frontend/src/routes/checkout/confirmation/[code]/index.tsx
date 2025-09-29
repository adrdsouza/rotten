import { component$, useContext, useStore, useVisibleTask$, $ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import CartContents from '~/components/cart-contents/CartContents';
import CartTotals from '~/components/cart-totals/CartTotals';
import CheckCircleIcon from '~/components/icons/CheckCircleIcon';
import { APP_STATE } from '~/constants';
import { CartContextId } from '~/contexts/CartContext';
import { Order } from '~/generated/graphql';
import { getOrderByCodeQuery } from '~/providers/shop/orders/order';
import { LocalCartService } from '~/services/LocalCartService';
import { createSEOHead } from '~/utils/seo';
import { StripePaymentService } from '~/services/StripePaymentService';
import { getStripePublishableKeyQuery } from '~/providers/shop/checkout/checkout';


export default component$(() => {
	const {
		params: { code },
	} = useLocation();
	const appState = useContext(APP_STATE);
	const localCart = useContext(CartContextId);
	const store = useStore<{
		order?: Order;
		loading: boolean;
		error?: string;
	}>({
		loading: true,
	});

<<<<<<< HEAD
	// ✅ Removed manual settlement - Stripe webhook handles this automatically
=======
	// Handle payment settlement for redirect flows
	const handlePaymentSettlement = $(async (paymentIntentId: string, orderCode: string) => {
		try {
			console.log('[Confirmation] Attempting to settle payment for PaymentIntent:', paymentIntentId);
			
			const stripeKey = await getStripePublishableKeyQuery();
			const stripeService = new StripePaymentService(
				stripeKey,
				'/shop-api',
				$(() => ({}))
			);

			// Attempt settlement with retry mechanism
			const settlementResult = await stripeService.retrySettlement(paymentIntentId, 3, 1000);

			if (settlementResult.success) {
				console.log('[Confirmation] Payment settled successfully');
			} else {
				console.error('[Confirmation] Settlement failed:', settlementResult.error);
				// Don't throw error here as the payment was already confirmed by Stripe
				// Just log the issue - the order should still be valid
			}
		} catch (error) {
			console.error('[Confirmation] Error during settlement:', error);
			// Don't throw error here as the payment was already confirmed by Stripe
		}
	});
>>>>>>> bacb344 (Kiro)

	useVisibleTask$(async () => {
		const url = new URL(window.location.href);
		const paymentIntentId = url.searchParams.get('payment_intent');
		const paymentIntentClientSecret = url.searchParams.get('payment_intent_client_secret');

		// Handle Stripe redirect case (Part B from spec)
		if (paymentIntentId && paymentIntentClientSecret) {
			console.log('[Confirmation] Handling Stripe redirect with PaymentIntent:', paymentIntentId);
			
			try {
				// Step 1: Verify payment intent with Stripe
				const { loadStripe } = await import('@stripe/stripe-js');
				const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
				const stripe = await loadStripe(stripeKey);
				
				if (!stripe) {
					throw new Error('Failed to load Stripe');
				}

				console.log('[Confirmation] Retrieving PaymentIntent from Stripe...');
				const { paymentIntent, error } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);
				
				if (error) {
					console.error('[Confirmation] Failed to retrieve PaymentIntent:', error);
					throw new Error(error.message || 'Failed to verify payment');
				}

				console.log('[Confirmation] PaymentIntent status:', paymentIntent?.status);

				// Step 2: Check if payment succeeded
				if (paymentIntent && paymentIntent.status === 'succeeded') {
					console.log('[Confirmation] Payment succeeded - PaymentIntent verified but NOT settling immediately');
					console.log('[Confirmation] PaymentIntent ID:', paymentIntentId, 'Status:', paymentIntent.status);
<<<<<<< HEAD

					// ✅ Payment confirmed by Stripe - webhook will handle settlement automatically
					console.log('[Confirmation] Payment succeeded - webhook will settle the order');
=======
					
					// NOTE: Settlement should have been handled by the payment flow
					// If we reach here via redirect, we may need to settle the payment
					// Check if payment needs settlement and handle it
					await handlePaymentSettlement(paymentIntentId, orderCode);
>>>>>>> bacb344 (Kiro)

					// 🎯 Clear the local cart and switch to Vendure mode after successful payment
					// This is where we finally switch modes after payment confirmation
					try {
						localCart.localCart = LocalCartService.clearCart();
						localCart.isLocalMode = false; // NOW we switch to Vendure mode after successful payment

						// Trigger cart update event for UI consistency
						if (typeof window !== 'undefined') {
							window.dispatchEvent(new CustomEvent('cart-updated', {
								detail: { totalQuantity: 0 }
							}));
						}

						console.log('[Confirmation] Local cart cleared and switched to Vendure mode after payment verification');
					} catch (clearCartError) {
						console.error('[Confirmation] Failed to clear local cart:', clearCartError);
						// Don't fail the confirmation process if cart clearing fails
					}

					// Continue to load order normally
				} else {
					console.error('[Confirmation] Payment not successful, status:', paymentIntent?.status);
					store.error = `Payment not successful. Status: ${paymentIntent?.status || 'unknown'}`;
					store.loading = false;
					return;
				}
			} catch (error) {
				console.error('[Confirmation] Error handling Stripe redirect:', error);
				store.error = `Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
				store.loading = false;
				return;
			}
		}

		// Normal order loading flow
		try {
			store.order = await getOrderByCodeQuery(code);

			if (store.order?.id) {
				appState.activeOrder = {
					...appState.activeOrder,
					id: '',
					code: '',
					lines: [],
					state: 'Completed',
					totalWithTax: 0,
					subTotal: 0,
					shippingLines: [],
					payments: []
				} as Order;

				localCart.localCart = LocalCartService.clearCart();
				localCart.isLocalMode = true;

				store.loading = false;
			} else {
				// Order not found - check if we have payment success info in localStorage
				const paymentInfo = localStorage.getItem('stripe_payment_success');
				if (paymentInfo) {
					const payment = JSON.parse(paymentInfo);
					if (payment.orderCode === code && payment.status === 'succeeded') {
						// Show success message even if order query failed
						console.log('[Confirmation] Order query failed but payment succeeded, showing success message');
						store.loading = false;
						// Don't set error - we'll show a success message instead
						return;
					}
				}
				
				store.error = `Order ${code} not found`;
				store.loading = false;
			}
		} catch (error) {
			// Check localStorage fallback on error too
			const paymentInfo = localStorage.getItem('stripe_payment_success');
			if (paymentInfo) {
				const payment = JSON.parse(paymentInfo);
				if (payment.orderCode === code && payment.status === 'succeeded') {
					console.log('[Confirmation] Order query error but payment succeeded, showing success message');
					store.loading = false;
					return;
				}
			}
			
			store.error = `Failed to load order: ${error}`;
			store.loading = false;
		}
	});



	return (
		<div>
			{store.loading && (
				<div class="bg-gray-50 pb-48">
					<div class="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8">
						<div class="text-center py-12">
							<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-red mx-auto mb-4"></div>
							<p class="text-gray-600">Loading your order confirmation...</p>
						</div>
					</div>
				</div>
			)}

			{store.error && (
				<div class="bg-gray-50 pb-48">
					<div class="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8">
						<div class="text-center py-12">
							<div class="text-red-500 mb-4">
								<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<h1 class="text-2xl font-semibold text-gray-900 mb-2">Order Not Found</h1>
							<p class="text-gray-600 mb-4">{store.error}</p>
							<Link href="/" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-brand-red hover:bg-red-700">
								Return to Home
							</Link>
						</div>
					</div>
				</div>
			)}

			{!store.loading && !store.error && !store.order?.id && (() => {
				const paymentInfo = localStorage.getItem('stripe_payment_success');
				const payment = paymentInfo ? JSON.parse(paymentInfo) : null;
				return payment?.orderCode === code && payment?.status === 'succeeded';
			})() && (
				<div class="bg-gray-50 pb-48">
					<div class="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8">
						<div class="mb-6 text-center">
							<h1 class="text-2xl flex items-center justify-center space-x-2 sm:text-3xl font-semibold text-gray-900 mb-2">
								<CheckCircleIcon forcedClass="w-6 h-6 sm:w-7 sm:h-7 text-brand-red" />
								<span>Payment Successful!</span>
							</h1>
							<p class="text-base text-gray-600 mb-1">
								Thank you for your order #{code}
							</p>
							<p class="text-sm text-gray-500">
								Your payment has been processed successfully. Order details will be available shortly.
							</p>
							<p class="text-sm text-gray-400 mt-4">
								You will receive an email confirmation once your order is fully processed.
							</p>
						</div>
					</div>
				</div>
			)}

			{store.order?.id && (
				<div class="bg-gray-50 pb-48">
					<div class="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8">
						<h2 class="sr-only">{`Order Confirmation`}</h2>

						<div class="mb-6 text-center">
							<h1 class="text-2xl flex items-center justify-center space-x-2 sm:text-3xl font-semibold text-gray-900 mb-2">
								<CheckCircleIcon forcedClass="w-6 h-6 sm:w-7 sm:h-7 text-brand-red" />
								<span>{`Ritual complete`}</span>
							</h1>
							<p class="text-base text-gray-600 mb-1">
								{`Thank you for your order #`}<span class="font-semibold text-gray-900">{store.order?.code}</span>
							</p>
							<p class="text-sm text-gray-500">
								{`It will be processed and shipped within 2 working days`}
							</p>
						</div>

						<div class="lg:grid lg:grid-cols-2 lg:gap-6">
							{/* Column 1 - Complete Order (Items + Summary) */}
							<div class="mb-8 lg:mb-0">
								<div class="bg-[#f5f5f5] rounded-2xl shadow-xs border border-gray-200/50 p-6">
									<h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
										<svg class="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
										</svg>
										{`Your Order`}
									</h2>

									<div class="mb-6">
										<CartContents order={store.order} />
									</div>

									<div class="border-t border-gray-100 pt-4">
										<CartTotals order={store.order} readonly />
									</div>
								</div>
							</div>

							{/* Column 2 - Customer, Address, Shipping & Payment Details */}
							<div>
								<div class="bg-[#f5f5f5] rounded-2xl shadow-xs border border-gray-200/50 p-6">
									<h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
										<svg class="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
										</svg>
										{`Order Details`}
									</h2>

									<div class="space-y-6">
										{/* Customer Information */}
										<div>
											<h3 class="text-sm font-medium text-gray-700 mb-2">{`Customer`}</h3>
											<div class="bg-gray-50 rounded-lg p-3">
												<p class="text-gray-900 font-medium text-sm">{store.order?.customer?.firstName} {store.order?.customer?.lastName}</p>
												<p class="text-gray-600 text-xs mt-1">{store.order?.customer?.emailAddress}</p>
											</div>
										</div>

										{/* Shipping Address */}
										<div>
											<h3 class="text-sm font-medium text-gray-700 mb-2">{`Shipping Address`}</h3>
											<div class="bg-gray-50 rounded-lg p-3">
												{store.order?.shippingAddress ? (
													<address class="not-italic text-gray-700 leading-relaxed text-xs">
														{store.order.shippingAddress.fullName && <div class="font-medium text-gray-900">{store.order.shippingAddress.fullName}</div>}
														<div>{store.order.shippingAddress.streetLine1}</div>
														{store.order.shippingAddress.streetLine2 && <div>{store.order.shippingAddress.streetLine2}</div>}
														<div>{store.order.shippingAddress.city}, {store.order.shippingAddress.province} {store.order.shippingAddress.postalCode}</div>
														<div>{store.order.shippingAddress.countryCode}</div>
														{store.order.shippingAddress.phoneNumber && <div class="mt-1 text-gray-600">{store.order.shippingAddress.phoneNumber}</div>}
													</address>
												) : (
													<p class="text-gray-400 text-xs">No shipping address found.</p>
												)}
											</div>
										</div>

										{/* Billing Address (Conditional) - UPDATED */}
										{store.order?.billingAddress?.streetLine1 && (
											<div>
												<h3 class="text-sm font-medium text-gray-700 mb-2">{`Billing Address`}</h3>
												<div class="bg-gray-50 rounded-lg p-3">
													<address class="not-italic text-gray-700 leading-relaxed text-xs">
														{store.order.billingAddress.fullName && <div class="font-medium text-gray-900">{store.order.billingAddress.fullName}</div>}
														<div>{store.order.billingAddress.streetLine1}</div>
														{store.order.billingAddress.streetLine2 && <div>{store.order.billingAddress.streetLine2}</div>}
														<div>{store.order.billingAddress.city}, {store.order.billingAddress.province} {store.order.billingAddress.postalCode}</div>
														<div>{store.order.billingAddress.countryCode}</div>
														{store.order.billingAddress.phoneNumber && <div class="mt-1 text-gray-600">{store.order.billingAddress.phoneNumber}</div>}
													</address>
												</div>
											</div>
										)}

										{/* Shipping Method */}
										<div>
											<h3 class="text-sm font-medium text-gray-700 mb-2">{`Shipping Method`}</h3>
											<div class="bg-gray-50 rounded-lg p-3">
												{store.order?.shippingLines?.length ? (
													<div class="space-y-2">
														{store.order.shippingLines.map((line, idx) => (
															<div key={idx} class="flex justify-between items-center">
																<span class="text-gray-700 text-xs">{line.shippingMethod.name}</span>
																<span class="font-medium text-gray-900 text-xs">${(line.priceWithTax / 100).toFixed(2)}</span>
															</div>
														))}
													</div>
												) : (
													<p class="text-gray-400 text-xs">No shipping method found.</p>
												)}
											</div>
										</div>

										{/* Payment Method */}
										<div>
											<h3 class="text-sm font-medium text-gray-700 mb-2">{`Payment Method`}</h3>
											<div class="bg-gray-50 rounded-lg p-3">
												{store.order?.payments?.length ? (
													<div class="space-y-2">
														{store.order.payments.map((payment, idx) => (
															<div key={idx} class="text-gray-700">
																<div class="flex justify-between items-center">
																	<span class="text-xs">{payment.method}</span>
																	<span class="text-xs text-gray-500">({payment.state})</span>
																</div>
																{payment.metadata?.cardType && payment.metadata?.last4 && (
																	<div class="text-xs text-gray-600 mt-1">
																		{payment.metadata.cardType} ending in {payment.metadata.last4}
																	</div>
																)}
															</div>
														))}
													</div>
												) : (
													<p class="text-gray-400 text-xs">No payment information found.</p>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
});

export const head = ({ params }: { params: { code: string } }) => {
	return createSEOHead({
		title: `Order Confirmation`,
		description: `Thank you for your order${params?.code ? ' #' + params.code : ''} at Rotten Hand. View your order summary and details.`,
		noindex: true,
	});
};
