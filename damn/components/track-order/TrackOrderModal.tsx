import { component$, useSignal, $, QRL, useVisibleTask$, useContext } from '@qwik.dev/core';
import { Order, Customer } from '~/generated/graphql';
import { trackOrderServer } from '~/services/track-order.service';
import { APP_STATE, CUSTOMER_NOT_DEFINED_ID } from '~/constants';
import { getActiveCustomerOrdersQuery } from '~/providers/shop/customer/customer';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose$: QRL<() => void>;
}

export default component$<TrackOrderModalProps>(({ isOpen, onClose$ }) => {
  const appState = useContext(APP_STATE);
  
  // Check authentication immediately and set initial screen
  const isAuthenticated = useSignal(false);
  const initialScreen = () => {
    const authenticated = !!(appState.customer && appState.customer.id !== CUSTOMER_NOT_DEFINED_ID);
    isAuthenticated.value = authenticated;
    return authenticated ? 'orderList' : 'input';
  };
  
  // Screen state: 'input' for guest users, 'orderList' for authenticated users, 'details' for order details
  const currentScreen = useSignal<'input' | 'orderList' | 'details'>(initialScreen());
  
  // Form state for guest tracking
  const orderCode = useSignal('');
  const email = useSignal('');
  const orderData = useSignal<Order | null>(null);
  const loading = useSignal(false);
  const error = useSignal('');
  
  // Authentication and order list state
  const customerOrders = useSignal<Customer | null>(null);
  const expandedOrders = useSignal<Set<string>>(new Set());

  // Auto-focus the order code input when modal opens and handle body scroll
  useVisibleTask$(({ track, cleanup }) => {
    track(() => isOpen);
    track(() => currentScreen.value);
    
    if (isOpen) {
      // Re-check authentication when modal opens (in case it changed)
      const authenticated = !!(appState.customer && appState.customer.id !== CUSTOMER_NOT_DEFINED_ID);
      isAuthenticated.value = authenticated;
      
      // Update screen if authentication state changed
      if (authenticated && currentScreen.value === 'input') {
        currentScreen.value = 'orderList';
      } else if (!authenticated && currentScreen.value === 'orderList') {
        currentScreen.value = 'input';
      }
      
      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      
      // Auto-focus the order code input when on input screen
      if (currentScreen.value === 'input') {
        setTimeout(() => {
          const orderInput = document.getElementById('modal-orderCode');
          if (orderInput) {
            orderInput.focus();
          }
        }, 100);
      }
      
      // Cleanup function to restore body scroll
      cleanup(() => {
        document.body.style.overflow = originalOverflow;
      });
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = '';
    }
  });

  // Load orders for authenticated users with custom field enrichment
  useVisibleTask$(async ({ track }) => {
    track(() => isAuthenticated.value);
    track(() => currentScreen.value);
    
    if (isAuthenticated.value && currentScreen.value === 'orderList' && !customerOrders.value) {
      try {
        loading.value = true;
        const customerData = await getActiveCustomerOrdersQuery();
        
        if (!customerData?.orders?.items) {
          customerOrders.value = customerData;
          return;
        }

        // Enrich orders with custom fields using the working server-side query
        const enrichedOrders = await Promise.all(
          customerData.orders.items.map(async (order: any) => {
            // If order has lines but missing custom fields, enrich with server data
            if (order.lines?.length > 0 && order.customer?.emailAddress) {
              const hasCustomFields = order.lines.some((line: any) => 
                line.productVariant?.customFields !== undefined
              );
              
              if (!hasCustomFields) {
                try {
                  const serverResult = await trackOrderServer(order.code, order.customer.emailAddress);
                  if (serverResult.success && serverResult.order) {
                    return serverResult.order;
                  }
                } catch (err) {
                  console.warn('Failed to enrich order with custom fields:', err);
                }
              }
            }
            return order;
          })
        );

        // Update with enriched orders
        customerOrders.value = {
          ...customerData,
          orders: {
            ...customerData.orders,
            items: enrichedOrders
          }
        };
      } catch (err) {
        console.error('Error loading customer orders:', err);
        error.value = 'Unable to load your orders at this time.';
      } finally {
        loading.value = false;
      }
    }
  });

  // Helper function to check if order contains pre-order items
  const hasPreOrderItems = (order: any) => {
    if (!order?.lines) return false;
    return order.lines.some((line: any) => 
      line.productVariant?.customFields?.preOrderPrice
    );
  };

  // Helper function to get the latest ship date from pre-order items
  const getLatestPreOrderShipDate = (order: any) => {
    if (!order?.lines) return null;
    
    const preOrderDates = order.lines
      .filter((line: any) => line.productVariant?.customFields?.preOrderPrice)
      .map((line: any) => line.productVariant?.customFields?.shipDate)
      .filter((date: any) => date) // Remove null/undefined dates
      .map((date: any) => new Date(date))
      .filter((date: Date) => !isNaN(date.getTime())); // Remove invalid dates
    
    if (preOrderDates.length === 0) return null;
    
    // Return the latest (farthest) date
    const timestamps = preOrderDates.map((date: Date) => date.getTime());
    const latestTimestamp = Math.max(...timestamps);
    const latestDate = new Date(latestTimestamp);
    return latestDate;
  };

  // Helper function to format ship date for display
  const formatShipDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Helper function to get user-friendly status display
  const getStatusDisplay = (state: string, order?: any) => {
    // Check if this is a PaymentSettled order with pre-order items
    if (state === 'PaymentSettled' && order && hasPreOrderItems(order)) {
      const latestShipDate = getLatestPreOrderShipDate(order);
      const shipDateText = latestShipDate 
        ? `Expected to ship around ${formatShipDate(latestShipDate)}`
        : 'Expected ship date to be announced';
      
      return {
        label: 'Pre-Ordered',
        description: shipDateText,
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
        borderColor: 'border-purple-200'
      };
    }
    
    switch (state) {
      case 'PaymentSettled':
        return {
          label: 'Processing',
          color: 'text-blue-700',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        };
      case 'PartiallyShipped':
        return {
          label: 'Partially Shipped',
          color: 'text-orange-700',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200'
        };
      case 'Shipped':
        return {
          label: 'Shipped',
          color: 'text-green-700',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        };
      case 'Delivered':
        return {
          label: 'Delivered',
          color: 'text-green-800',
          bgColor: 'bg-green-200',
          borderColor: 'border-green-300'
        };
      case 'Cancelled':
        return {
          label: 'Cancelled',
          color: 'text-red-700',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        };
      default:
        return {
          label: 'Processing',
          color: 'text-gray-700',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200'
        };
    }
  };

  const handleTrackOrder = $(async () => {
    if (!orderCode.value.trim() || !email.value.trim()) {
      error.value = 'Please enter both order number and email address.';
      return;
    }

    loading.value = true;
    error.value = '';

    try {
      const result = await trackOrderServer(orderCode.value.trim(), email.value.trim());
      
      if (result.success && result.order) {
        orderData.value = result.order;
        currentScreen.value = 'details';
        error.value = '';
      } else {
        error.value = result.error || 'Order not found. Please check your order number and email address.';
      }
    } catch (err) {
      error.value = 'Unable to track order at this time. Please try again later.';
      console.error('Track order error:', err);
    } finally {
      loading.value = false;
    }
  });

  const handleBack = $(() => {
    currentScreen.value = isAuthenticated.value ? 'orderList' : 'input';
    error.value = '';
  });

  const toggleOrderExpansion = $((orderId: string) => {
    const newExpanded = new Set(expandedOrders.value);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    expandedOrders.value = newExpanded;
  });

  const viewOrderDetails = $(async (order: any) => {
    // Use the working trackOrderServer to get full order details with custom fields
    loading.value = true;
    try {
      const result = await trackOrderServer(order.code, order.customer.emailAddress);
      if (result.success && result.order) {
        orderData.value = result.order;
        currentScreen.value = 'details';
      } else {
        // Fallback to original order data if server tracking fails
        orderData.value = order;
        currentScreen.value = 'details';
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      // Fallback to original order data
      orderData.value = order;
      currentScreen.value = 'details';
    } finally {
      loading.value = false;
    }
  });

  const handleClose = $(async () => {
    // Reset state when closing
    const initialScreenValue = () => {
      const authenticated = !!(appState.customer && appState.customer.id !== CUSTOMER_NOT_DEFINED_ID);
      isAuthenticated.value = authenticated;
      return authenticated ? 'orderList' : 'input';
    };
    
    currentScreen.value = initialScreenValue();
    orderCode.value = '';
    email.value = '';
    orderData.value = null;
    customerOrders.value = null;
    expandedOrders.value = new Set();
    error.value = '';
    loading.value = false;
    
    await onClose$();
  });

  if (!isOpen) return null;

  return (
    <div 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-fade-in overflow-hidden"
      onClick$={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class={`relative bg-white rounded-xl shadow-2xl transition-all duration-300 ${
          currentScreen.value === 'input' 
            ? 'w-full max-w-md' 
            : 'w-full max-w-4xl max-h-[90vh] overflow-y-auto'
        }`}>
          {/* Modal Content */}
          <div class="p-6">
            {currentScreen.value === 'input' ? (
              /* Input Screen */
              <div class="space-y-6">
                <p class="text-gray-600 text-center">
                  Please enter the email address used for the order and the order number received in the confirmation email.
                </p>
                
                <form preventdefault:submit onSubmit$={handleTrackOrder} class="space-y-4">
                  <div>
                    <input
                      id="modal-orderCode"
                      type="text"
                      bind:value={orderCode}
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d42838] focus:border-transparent transition-all duration-200 text-lg"
                      placeholder="Order Number (DD12345)"
                      required
                      autocomplete="off"
                    />
                  </div>
                  
                  <div>
                    <input
                      id="modal-email"
                      type="email"
                      bind:value={email}
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d42838] focus:border-transparent transition-all duration-200 text-lg"
                      placeholder="Email Address (your@email.com)"
                      required
                      autocomplete="email"
                    />
                  </div>

                  {error.value && (
                    <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div class="flex items-start gap-3">
                        <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h3 class="text-sm font-semibold text-red-800">Unable to track order</h3>
                          <p class="text-sm text-red-700 mt-1">{error.value}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading.value}
                    class="w-full bg-[#d42838] hover:bg-black disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading.value ? (
                      <>
                        <svg class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Tracking...</span>
                      </>
                    ) : (
                      <>
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span>Track Order</span>
                      </>
                    )}
                  </button>
                </form>
                
                {/* Close link at bottom */}
                <div class="text-center pt-4">
                  <button
                    onClick$={handleClose}
                    class="text-gray-600 hover:text-[#d42838] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : currentScreen.value === 'orderList' ? (
              /* Order List Screen for Authenticated Users */
              <div class="space-y-6">
                <div class="text-center">
                  <h2 class="text-2xl font-bold text-gray-900">Your Orders</h2>
                  <p class="text-gray-600 mt-2">Click on any order to view details and tracking information</p>
                </div>

                {loading.value ? (
                  <div class="flex justify-center items-center py-12">
                    <svg class="animate-spin h-8 w-8 text-[#d42838]" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span class="ml-3 text-gray-600">Loading your orders...</span>
                  </div>
                ) : error.value ? (
                  <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h3 class="text-sm font-semibold text-red-800">Unable to load orders</h3>
                        <p class="text-sm text-red-700 mt-1">{error.value}</p>
                      </div>
                    </div>
                  </div>
                ) : customerOrders.value?.orders?.items?.length ? (
                  <div class="space-y-4 max-h-[60vh] overflow-y-auto">
                    {customerOrders.value.orders.items.map((order: any) => {
                      const status = getStatusDisplay(order.state, order);
                      const isExpanded = expandedOrders.value.has(order.id);
                      
                      return (
                        <div key={order.id} class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                          {/* Order Header */}
                          <div 
                            class="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick$={() => toggleOrderExpansion(order.id)}
                          >
                            <div class="flex items-center justify-between">
                              <div class="flex items-center space-x-4">
                                <div>
                                  <div class="font-semibold text-gray-900">Order #{order.code}</div>
                                  <div class="text-sm text-gray-500">
                                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </div>
                                </div>
                                <div class={`inline-flex items-center gap-2 px-3 py-1 ${status.bgColor} border ${status.borderColor} rounded-full text-xs font-medium ${status.color}`}>
                                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {status.label}
                                </div>
                              </div>
                              <div class="flex items-center space-x-4">
                                <div class="text-right">
                                  <div class="font-semibold text-gray-900">
                                    ${(order.totalWithTax / 100).toFixed(2)}
                                  </div>
                                  <div class="text-sm text-gray-500">
                                    {order.lines?.length || 0} item{(order.lines?.length || 0) !== 1 ? 's' : ''}
                                  </div>
                                </div>
                                <svg 
                                  class={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expanded Content */}
                          {isExpanded && (
                            <div class="border-t border-gray-200 bg-gray-50 p-4">
                              <div class="space-y-4">
                                {/* Order Items Preview */}
                                {order.lines && order.lines.length > 0 && (
                                  <div>
                                    <h4 class="text-sm font-medium text-gray-700 mb-2">Items</h4>
                                    <div class="space-y-2">
                                      {order.lines.slice(0, 3).map((line: any) => (
                                        <div key={line.id} class="flex items-center space-x-3">
                                          <div class="w-8 h-8 border border-gray-200 rounded overflow-hidden flex-shrink-0">
                                            {line.featuredAsset?.preview ? (
                                              <img 
                                                src={line.featuredAsset.preview} 
                                                alt={line.productVariant.name}
                                                class="w-full h-full object-cover"
                                                width={32}
                                                height={32}
                                              />
                                            ) : (
                                              <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                              </div>
                                            )}
                                          </div>
                                          <div class="flex-1 min-w-0">
                                            <p class="text-sm text-gray-900 truncate">{line.productVariant.name}</p>
                                            <p class="text-xs text-gray-500">Qty: {line.quantity}</p>
                                          </div>
                                        </div>
                                      ))}
                                      {order.lines.length > 3 && (
                                        <div class="text-xs text-gray-500">+{order.lines.length - 3} more items</div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Action Button */}
                                <button
                                  onClick$={() => viewOrderDetails(order)}
                                  class="w-full bg-[#d42838] hover:bg-black text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm cursor-pointer"
                                >
                                  View Full Details & Tracking
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div class="text-center py-12">
                    <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="text-gray-500">No orders found</p>
                  </div>
                )}
                
                {/* Close Button */}
                <div class="text-center pt-4 border-t border-gray-200">
                  <button
                    onClick$={handleClose}
                    class="text-gray-600 hover:text-[#d42838] transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Details Screen */
              <div>
                {/* Order Header - Compact with total in header */}
                <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-gray-200 mb-6 gap-3">
                  <div class="flex flex-col gap-1">
                    <div class="text-xl font-semibold text-gray-900">Order #{orderData.value?.code}</div>
                    {/* Order Status moved to center-left */}
                    <div class="mt-2">
                      {(() => {
                        const status = getStatusDisplay(orderData.value?.state || '', orderData.value);
                        return (
                          <div class={`inline-flex items-center gap-2 px-3 py-1.5 ${status.bgColor} border ${status.borderColor} rounded-full text-sm font-medium ${status.color}`}>
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {status.label}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Order Total moved to top right */}
                  <div class="text-right">
                    <div class="text-sm font-medium text-gray-600">Order Total</div>
                    <div class="text-2xl font-bold text-gray-900">
                      {orderData.value?.totalWithTax ? `$${(orderData.value.totalWithTax / 100).toFixed(2)}` : '$0.00'}
                    </div>
                  </div>
                </div>
                
                {/* Details Grid - Shipping Address and Tracking */}
                <div class="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Shipping Address */}
                  {orderData.value?.shippingAddress && (
                    <div>
                      <div class="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Shipping Address
                      </div>
                      <div class="pl-6 text-sm text-gray-600 leading-relaxed">
                        <div class="font-medium text-gray-900 mb-0.5">{orderData.value.shippingAddress.fullName}</div>
                        <div class="mb-0.5">{orderData.value.shippingAddress.streetLine1}</div>
                        {orderData.value.shippingAddress.streetLine2 && (
                          <div class="mb-0.5">{orderData.value.shippingAddress.streetLine2}</div>
                        )}
                        <div class="mb-0.5">
                          {orderData.value.shippingAddress.city}, {orderData.value.shippingAddress.province} {orderData.value.shippingAddress.postalCode}
                        </div>
                        <div>{orderData.value.shippingAddress.countryCode}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Tracking Information */}
                  <div>
                    <div class="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      Tracking Information
                    </div>
                    <div class="pl-6 text-sm text-gray-600">
                      {orderData.value?.fulfillments && orderData.value.fulfillments.length > 0 && orderData.value.fulfillments.some(f => f.trackingCode) ? (
                        <div>
                          {orderData.value.fulfillments.map((fulfillment, index) => (
                            fulfillment.trackingCode && (
                              <div key={fulfillment.id} class="mb-4">
                                <div class="font-medium text-gray-900 mb-1">Shipment {index + 1}</div>
                                <div class="text-gray-500 mb-2">Method: {fulfillment.method || 'USPS'}</div>
                                <a 
                                  href={`https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${fulfillment.trackingCode}`}
                                  target="_blank"
                                  class="text-[#d42838] hover:text-black font-medium flex items-center gap-1 transition-colors"
                                >
                                  {fulfillment.trackingCode}
                                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )
                          ))}
                        </div>
                      ) : (
                        <div>
                          {/* Check if this is a pre-order and show notice */}
                          {hasPreOrderItems(orderData.value) ? (
                            <div class="text-gray-500 italic">Tracking will be updated when your pre-order ships</div>
                          ) : (
                            <div class="text-gray-500 italic">Tracking will be updated once order ships</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Order Items - Improved with proper aspect ratio */}
                {orderData.value?.lines && orderData.value.lines.length > 0 && (
                  <div class="bg-white border border-gray-200 rounded-lg overflow-hidden mb-6">
                    <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 class="text-sm font-semibold text-gray-900">Order Items</h3>
                    </div>
                    <div class="divide-y divide-gray-200">
                      {orderData.value.lines.map((line) => (
                        <div key={line.id} class="p-4 flex gap-4">
                          {/* Product image with proper aspect ratio */}
                          <div class="flex-shrink-0 w-16 border border-gray-200 rounded-md overflow-hidden">
                            <div class="relative aspect-4/5">
                              {line.featuredAsset?.preview ? (
                                <img
                                  src={line.featuredAsset.preview}
                                  alt={line.productVariant.name}
                                  class="w-full h-full object-cover object-center"
                                  width={64}
                                  height={80}
                                />
                              ) : (
                                <div class="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Product details - more compact */}
                          <div class="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h4 class="text-sm font-medium text-gray-900 truncate">{line.productVariant.name}</h4>
                              <p class="text-xs text-gray-500 mt-0.5">SKU: {line.productVariant.sku}</p>
                              {/* Show pre-order badge and ship date for pre-order items */}
                              {line.productVariant?.customFields?.preOrderPrice && (
                                <div class="mt-1 space-y-1">
                                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                    📦 Pre-Order
                                  </span>
                                  {line.productVariant.customFields.shipDate ? (
                                    <p class="text-xs text-purple-600 font-medium">
                                      📅 Expected to ship: {line.productVariant.customFields.shipDate}
                                    </p>
                                  ) : (
                                    <p class="text-xs text-purple-600 font-medium">
                                      📅 Ship date to be announced
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div class="flex items-center justify-between mt-2">
                              <span class="text-sm text-gray-600 font-medium">Qty: {line.quantity}</span>
                              <div class="text-right">
                                <p class="text-sm font-semibold text-gray-900">
                                  ${(line.linePriceWithTax / 100).toFixed(2)}
                                </p>
                                <p class="text-xs text-gray-500">
                                  ${(line.unitPriceWithTax / 100).toFixed(2)} each
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div class="flex gap-3 pt-5 border-t border-gray-200">
                  <button
                    onClick$={handleBack}
                    class="flex-1 py-3 px-4 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Track Another Order
                  </button>
                  <button
                    onClick$={handleClose}
                    class="flex-1 py-3 px-4 bg-[#d42838] text-white rounded-lg font-medium text-sm hover:bg-black transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});