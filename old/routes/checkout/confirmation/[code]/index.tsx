import { component$, useContext, useStore, useVisibleTask$ } from '@qwik.dev/core';
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

	useVisibleTask$(async () => {
		try {
			store.order = await getOrderByCodeQuery(code);

			if (store.order?.id) {
				// Clear the active order and reset to empty state
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

				// Clear local cart and set to local mode
				localCart.localCart = LocalCartService.clearCart();
				localCart.isLocalMode = true;
				
				store.loading = false;
			} else {
				store.error = `Order ${code} not found`;
				store.loading = false;
			}
		} catch (error) {
			store.error = `Failed to load order: ${error}`;
			store.loading = false;
		}
	});

	// Show loading state while querying fresh data
	if (store.loading) {
		return (
			<div class="min-h-screen bg-gray-50 flex items-center justify-center">
				<div class="text-center">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B09983] mx-auto mb-4"></div>
					<p class="text-gray-600">Loading order details...</p>
				</div>
			</div>
		);
	}

	// Show error state if query failed
	if (store.error || !store.order) {
		return (
			<div class="min-h-screen bg-gray-50 flex items-center justify-center">
				<div class="max-w-md mx-auto text-center px-4">
					<div class="mb-6">
						<svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
					<h1 class="text-2xl font-semibold text-gray-900 mb-4">Order Not Found</h1>
					<p class="text-gray-600 mb-6">
						The order you're looking for could not be found. This may happen if:
					</p>
					<ul class="text-left text-gray-600 mb-8 space-y-2">
						<li class="flex items-start">
							<span class="text-gray-400 mr-2">•</span>
							The order link has expired or is invalid
						</li>
						<li class="flex items-start">
							<span class="text-gray-400 mr-2">•</span>
							The order was automatically cleaned up due to inactivity
						</li>
						<li class="flex items-start">
							<span class="text-gray-400 mr-2">•</span>
							There was an issue with the order processing
						</li>
					</ul>
					<div class="space-y-3">
						<Link 
							href="/" 
							class="block w-full bg-[#B09983] text-white px-6 py-3 rounded-md hover:bg-[#4F3B26] transition-colors"
						>
							Continue Shopping
						</Link>
						<Link 
							href="/contact" 
							class="block w-full text-[#B09983] hover:text-[#4F3B26] underline"
						>
							Contact Support
						</Link>
					</div>
					{store.error && (
						<p class="text-xs text-gray-500 mt-4">
							Error: {store.error}
						</p>
					)}
				</div>
			</div>
		);
	}

	// Use fresh order data
	const orderData = store.order;

	return (
		<div>
			{/* No loading state needed - pure data passing architecture */}

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

			{/* REMOVED: Sezzle verification error UI - not available for this clothing brand */}

			{orderData?.id && (
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
									{`Thank you for your order #`}<span class="font-semibold text-gray-900">{orderData?.code}</span>
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
										{orderData && <CartContents order={orderData} />}
									</div>
									
									<div class="border-t border-gray-100 pt-4">
										{orderData && <CartTotals localCart={orderData} readonly />}
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
												<p class="text-gray-900 font-medium text-sm">{orderData?.customer?.firstName} {orderData?.customer?.lastName}</p>
												<p class="text-gray-600 text-xs mt-1">{orderData?.customer?.emailAddress}</p>
											</div>
										</div>

										{/* Shipping Address */}
										<div>
											<h3 class="text-sm font-medium text-gray-700 mb-2">{`Shipping Address`}</h3>
											<div class="bg-gray-50 rounded-lg p-3">
												{orderData?.shippingAddress ? (
													<address class="not-italic text-gray-700 leading-relaxed text-xs">
														{orderData.shippingAddress.fullName && <div class="font-medium text-gray-900">{orderData.shippingAddress.fullName}</div>}
														<div>{orderData.shippingAddress.streetLine1}</div>
														{orderData.shippingAddress.streetLine2 && <div>{orderData.shippingAddress.streetLine2}</div>}
														<div>{orderData.shippingAddress.city}, {orderData.shippingAddress.province} {orderData.shippingAddress.postalCode}</div>
														<div>{orderData.shippingAddress.countryCode}</div>
														{orderData.shippingAddress.phoneNumber && <div class="mt-1 text-gray-600">{orderData.shippingAddress.phoneNumber}</div>}
													</address>
												) : (
													<p class="text-gray-400 text-xs">No shipping address found.</p>
												)}
											</div>
										</div>

										{/* Billing Address (Conditional) - UPDATED */}
										{orderData?.billingAddress?.streetLine1 && (
											<div>
												<h3 class="text-sm font-medium text-gray-700 mb-2">{`Billing Address`}</h3>
												<div class="bg-gray-50 rounded-lg p-3">
													<address class="not-italic text-gray-700 leading-relaxed text-xs">
														{orderData.billingAddress.fullName && <div class="font-medium text-gray-900">{orderData.billingAddress.fullName}</div>}
														<div>{orderData.billingAddress.streetLine1}</div>
														{orderData.billingAddress.streetLine2 && <div>{orderData.billingAddress.streetLine2}</div>}
														<div>{orderData.billingAddress.city}, {orderData.billingAddress.province} {orderData.billingAddress.postalCode}</div>
														<div>{orderData.billingAddress.countryCode}</div>
														{orderData.billingAddress.phoneNumber && <div class="mt-1 text-gray-600">{orderData.billingAddress.phoneNumber}</div>}
													</address>
												</div>
											</div>
										)}

										{/* Shipping Method */}
										<div>
											<h3 class="text-sm font-medium text-gray-700 mb-2">{`Shipping Method`}</h3>
											<div class="bg-gray-50 rounded-lg p-3">
												{orderData?.shippingLines?.length ? (
													<div class="space-y-2">
														{orderData.shippingLines.map((line: any, idx: number) => (
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
												{orderData?.payments?.length ? (
													<div class="space-y-2">
														{orderData.payments.map((payment: any, idx: number) => (
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
