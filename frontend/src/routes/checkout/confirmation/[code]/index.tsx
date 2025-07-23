import { component$, useContext, useStore, useVisibleTask$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import CartContents from '~/components/cart-contents/CartContents';
import CartTotals from '~/components/cart-totals/CartTotals';
import CheckCircleIcon from '~/components/icons/CheckCircleIcon';
import { APP_STATE } from '~/constants';
import { Order } from '~/generated/graphql';
import { getOrderByCodeQuery, verifySezzlePaymentMutation } from '~/providers/shop/orders/order';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
	const {
		params: { code },
	} = useLocation();
	const appState = useContext(APP_STATE);
	const store = useStore<{
		order?: Order;
		loading: boolean;
		error?: string;
		sezzleVerificationFailed?: boolean;
		sezzleErrorMessage?: string;
	}>({
		loading: true,
	});

	useVisibleTask$(async () => {
		try {
			// console.log(`[Confirmation] Loading order with code: ${code}`);
			store.order = await getOrderByCodeQuery(code);
			// console.log(`[Confirmation] Order loaded:`, store.order);

			// Check if this order has a Sezzle payment that needs verification
			const sezzlePayment = store.order?.payments?.find(p => p.method === 'sezzle' && p.state === 'Authorized');
			if (sezzlePayment) {
				// console.log(`[Confirmation] Found Sezzle payment ${sezzlePayment.id}, verifying with Sezzle...`);
				try {
					const verificationResult = await verifySezzlePaymentMutation(code);
					// console.log(`[Confirmation] Sezzle verification result:`, verificationResult);

					if (verificationResult.success) {
						// console.log(`[Confirmation] Sezzle payment verified and settled successfully`);
						// Reload the order to get updated payment status
						store.order = await getOrderByCodeQuery(code);
					} else {
						// console.warn(`[Confirmation] Sezzle payment verification failed: ${verificationResult.message}`);
						// Set Sezzle verification failure state
						store.sezzleVerificationFailed = true;
						store.sezzleErrorMessage = verificationResult.message || 'Payment verification failed';
						store.loading = false;
						return; // Don't proceed with normal order completion flow
					}
				} catch (_verificationError) {
					// console.error(`[Confirmation] Sezzle verification error:`, verificationError);
					// Set Sezzle verification failure state for network/server errors
					store.sezzleVerificationFailed = true;
					store.sezzleErrorMessage = 'Unable to verify payment status. Please contact support if payment was deducted.';
					store.loading = false;
					return; // Don't proceed with normal order completion flow
				}
			}

			// Mark the order as complete without clearing the activeOrder entirely
			// This ensures the cart is ready for a new order while preserving state for navigation
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
				// console.log('✅ Order marked as complete, ready for new order without full state reset');
				store.loading = false;
			} else {
				// console.error(`[Confirmation] No order found with code: ${code}`);
				store.error = `Order ${code} not found`;
				store.loading = false;
			}
		} catch (error) {
			// console.error(`[Confirmation] Error loading order:`, error);
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

			{store.sezzleVerificationFailed && (
				<div class="bg-gray-50 pb-48">
					<div class="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8">
						<div class="text-center py-12">
							<div class="text-yellow-500 mb-4">
								<svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
								</svg>
							</div>
							<h1 class="text-2xl font-semibold text-gray-900 mb-2">Payment Verification Error</h1>
							<p class="text-gray-600 mb-4">{store.sezzleErrorMessage}</p>
							<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
								<p class="text-sm text-yellow-800">
									<strong>Important:</strong> If payment has been deducted from your account, please contact our support team with order code <strong>#{code}</strong>
								</p>
							</div>
							<div class="space-y-3">
								<Link href="/contact" class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-2">
									Contact Support
								</Link>
								<Link href="/checkout" class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
									Try Again
								</Link>
							</div>
						</div>
					</div>
				</div>
			)}

			{store.order?.id && !store.sezzleVerificationFailed && (
				<div class="bg-gray-50 pb-48">
						<div class="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8">
							<h2 class="sr-only">{`Order Confirmation`}</h2>
							
							{/* Header Section - Compact */}
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

						{/* Main Content Grid - 3 Box Layout */}
						<div class="lg:grid lg:grid-cols-3 lg:gap-6">
							{/* Box 1 - Complete Order (Items + Summary) */}
							<div class="mb-8 lg:mb-0">
								<div class="bg-[#f5f5f5] rounded-2xl shadow-xs border border-gray-200/50 p-6">
									<h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
										<svg class="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
										</svg>
										{`Your Order`}
									</h2>
									
									{/* Order Items */}
									<div class="mb-6">
										<CartContents order={store.order} />
									</div>
									
									{/* Order Totals */}
									<div class="border-t border-gray-100 pt-4">
										<CartTotals order={store.order} readonly />
									</div>
								</div>
							</div>

							{/* Box 2 - Customer & Address Details */}
							<div class="mb-8 lg:mb-0">
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

										{/* Billing Address */}
										<div>
											<h3 class="text-sm font-medium text-gray-700 mb-2">{`Billing Address`}</h3>
											<div class="bg-gray-50 rounded-lg p-3">
												{store.order?.billingAddress ? (
													<address class="not-italic text-gray-700 leading-relaxed text-xs">
														{store.order.billingAddress.fullName && <div class="font-medium text-gray-900">{store.order.billingAddress.fullName}</div>}
														<div>{store.order.billingAddress.streetLine1}</div>
														{store.order.billingAddress.streetLine2 && <div>{store.order.billingAddress.streetLine2}</div>}
														<div>{store.order.billingAddress.city}, {store.order.billingAddress.province} {store.order.billingAddress.postalCode}</div>
														<div>{store.order.billingAddress.countryCode}</div>
														{store.order.billingAddress.phoneNumber && <div class="mt-1 text-gray-600">{store.order.billingAddress.phoneNumber}</div>}
													</address>
												) : (
													<div class="text-gray-600 italic text-xs">
														{`Same as shipping address`}
													</div>
												)}
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Box 3 - Shipping & Payment Methods */}
							<div>
								<div class="bg-[#f5f5f5] rounded-2xl shadow-xs border border-gray-200/50 p-6">
									<h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
										<svg class="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
										</svg>
										{`Shipping & Payment`}
									</h2>
									
									<div class="space-y-6">
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
