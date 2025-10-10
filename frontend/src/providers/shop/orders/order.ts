import gql from 'graphql-tag';
import { AddPaymentToOrderMutation, TransitionOrderToStateMutation, AddItemInput, RemoveAllOrderLinesMutation } from '~/generated/graphql-shop';
import {
	ActiveOrderQuery,
	AddItemToOrderMutation,
	AdjustOrderLineMutation,
	CreateAddressInput,
	CreateCustomerInput,
	Order,
	OrderByCodeQuery,
	RemoveOrderLineMutation,
	SetCustomerForOrderMutation,
	SetOrderShippingAddressMutation,
	SetOrderShippingMethodMutation,
} from '~/generated/graphql';
import { 
	ApplyCouponCodeMutation, 
	RemoveCouponCodeMutation,
	SetOrderBillingAddressMutation
} from '~/generated/graphql-shop';
import { shopSdk } from '~/graphql-wrapper';
import { requester } from '~/utils/api';

export const getActiveOrderQuery = async () => {
	return shopSdk.activeOrder(undefined).then((res: ActiveOrderQuery) => res.activeOrder as Order);
};

export const getOrderByCodeQuery = async (code: string) => {
	return shopSdk.orderByCode({ code }).then((res: OrderByCodeQuery) => res.orderByCode as Order);
};

export const addItemToOrderMutation = async (productVariantId: string, quantity: number) => {
	return shopSdk
		.addItemToOrder({ productVariantId, quantity })
		.then((res: AddItemToOrderMutation) => res.addItemToOrder);
};

export const addItemsToOrderMutation = async (inputs: AddItemInput[]) => {
	const mutation = gql`
		mutation addItemsToOrder($inputs: [AddItemInput!]!) {
			addItemsToOrder(inputs: $inputs) {
				__typename
				... on UpdateMultipleOrderItemsResult {
					order {
						...CustomOrderDetail
					}
					errorResults {
						__typename
						... on InsufficientStockError {
							errorCode
							message
							quantityAvailable
						}
						... on NegativeQuantityError {
							errorCode
							message
						}
						... on OrderLimitError {
							errorCode
							message
							maxItems
						}
						... on OrderInterceptorError {
							errorCode
							message
						}
					}
				}
			}
		}
		${CustomOrderDetailFragment}
	`;

	try {
		const result: any = await requester(mutation, { inputs });
		return result.addItemsToOrder;
	} catch (error) {
		console.error('Error in addItemsToOrderMutation:', error);
		throw error;
	}
};

export const removeOrderLineMutation = async (lineId: string) => {
	return shopSdk
		.removeOrderLine({ orderLineId: lineId })
		.then((res: RemoveOrderLineMutation) => {
			const result = res.removeOrderLine;
			// Handle ErrorResult case (e.g., when removing last item)
			if (result && 'errorCode' in result) {
				// If it's an error (like ORDER_MODIFICATION_ERROR when order becomes empty),
				// return null to indicate the order is now empty/invalid
				return null;
			}
			return result as Order;
		});
};

export const removeAllOrderLinesMutation = async () => {
	return shopSdk
		.removeAllOrderLines()
		.then((res: RemoveAllOrderLinesMutation) => {
			const result = res.removeAllOrderLines;
			// Handle ErrorResult case
			if (result && 'errorCode' in result) {
				console.log('Remove all order lines resulted in error:', result.errorCode);
				return null;
			}
			return result as Order;
		})
		.catch((error) => {
			console.error('Error in removeAllOrderLinesMutation:', error);
			throw error;
		});
};

export const adjustOrderLineMutation = async (lineId: string, quantity: number) => {
	return shopSdk
		.adjustOrderLine({ orderLineId: lineId, quantity })
		.then((res: AdjustOrderLineMutation) => res.adjustOrderLine as Order);
};

export const setOrderShippingAddressMutation = async (input: CreateAddressInput) => {
	return shopSdk
		.setOrderShippingAddress({ input })
		.then((res: SetOrderShippingAddressMutation) => res.setOrderShippingAddress);
};

export const setOrderShippingMethodMutation = async (shippingMethodId: string[]) => {
	return shopSdk
		.setOrderShippingMethod({ shippingMethodId })
		.then((res: SetOrderShippingMethodMutation) => res.setOrderShippingMethod as Order);
};

export const setCustomerForOrderMutation = async (input: CreateCustomerInput) => {
	return shopSdk
		.setCustomerForOrder({ input })
		.then((res: SetCustomerForOrderMutation) => res.setCustomerForOrder);
};

export const applyCouponCodeMutation = async (couponCode: string) => {
	return shopSdk
		.applyCouponCode({ couponCode })
		.then((res: ApplyCouponCodeMutation) => res.applyCouponCode);
};

export const removeCouponCodeMutation = async (couponCode: string) => {
	return shopSdk
		.removeCouponCode({ couponCode })
		.then((res: RemoveCouponCodeMutation) => res.removeCouponCode);
};

// Custom coupon validation for local cart
export const validateLocalCartCouponQuery = async (input: {
	couponCode: string;
	cartTotal: number;
	cartItems: Array<{
		productVariantId: string;
		quantity: number;
		unitPrice: number;
	}>;
	customerId?: string;
}): Promise<{
	isValid: boolean;
	validationErrors: string[];
	appliedCouponCode?: string;
	discountAmount: number;
	discountPercentage?: number;
	freeShipping: boolean;
	promotionName?: string;
	promotionDescription?: string;
}> => {
	try {
		const response = await fetch('/api/validate-coupon', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(input),
		});
		
		if (!response.ok) {
			throw new Error('Failed to validate coupon');
		}
		
		return await response.json();
	} catch (error) {
		console.error('Error validating coupon:', error);
		return {
			isValid: false,
			validationErrors: ['Failed to validate coupon'],
			discountAmount: 0,
			freeShipping: false,
		};
	}
};

export const setOrderBillingAddressMutation = async (input: CreateAddressInput) => {
	return shopSdk
		.setOrderBillingAddress({ input })
		.then((res: SetOrderBillingAddressMutation) => res.setOrderBillingAddress);
};

export const transitionOrderToStateMutation = async (state: string) => {
	return shopSdk
		.transitionOrderToState({ state })
		.then((res: TransitionOrderToStateMutation) => res.transitionOrderToState);
};

export const addPaymentToOrderMutation = async (input: any) => {
	return shopSdk.addPaymentToOrder({ input }).then((res: AddPaymentToOrderMutation) => res.addPaymentToOrder);
};

export const CustomOrderDetailFragment = gql`
	fragment CustomOrderDetail on Order {
		__typename
		id
		code
		active
		createdAt
		state
		currencyCode
		couponCodes
		discounts {
			type
			description
			amountWithTax
		}
		totalQuantity
		subTotal
		subTotalWithTax
		taxSummary {
			description
			taxRate
			taxTotal
		}
		shippingWithTax
		totalWithTax
		customer {
			id
			firstName
			lastName
			emailAddress
		}
		shippingAddress {
			fullName
			streetLine1
			streetLine2
			company
			city
			province
			postalCode
			countryCode
			phoneNumber
		}
		billingAddress {
			fullName
			streetLine1
			streetLine2
			company
			city
			province
			postalCode
			countryCode
			phoneNumber
		}
		shippingLines {
			shippingMethod {
				id
				name
			}
			priceWithTax
		}
		lines {
			id
			unitPriceWithTax
			linePriceWithTax
			quantity
			featuredAsset {
				id
				preview
			}
			productVariant {
				id
				name
				price
				stockLevel
				options {
					id
					code
					name
					group {
						id
						name
					}
				}
				product {
					id
					name
					slug
				}
			}
		}
		payments {
			id
			method
			amount
			state
			transactionId
			metadata
		}
	}
`;

gql`
	mutation applyCouponCode($couponCode: String!) {
		applyCouponCode(couponCode: $couponCode) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation removeCouponCode($couponCode: String!) {
		removeCouponCode(couponCode: $couponCode) {
			...CustomOrderDetail
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation setOrderShippingAddress($input: CreateAddressInput!) {
		setOrderShippingAddress(input: $input) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation setCustomerForOrder($input: CreateCustomerInput!) {
		setCustomerForOrder(input: $input) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	query validateLocalCartCoupon($input: ValidateLocalCartCouponInput!) {
		validateLocalCartCoupon(input: $input) {
			isValid
			validationErrors
			appliedCouponCode
			discountAmount
			discountPercentage
			freeShipping
			promotionName
			promotionDescription
		}
	}
`;

gql`
	mutation setOrderBillingAddress($input: CreateAddressInput!) {
		setOrderBillingAddress(input: $input) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation addItemToOrder($productVariantId: ID!, $quantity: Int!) {
		addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation setOrderShippingMethod($shippingMethodId: [ID!]!) {
		setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation adjustOrderLine($orderLineId: ID!, $quantity: Int!) {
		adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation removeOrderLine($orderLineId: ID!) {
		removeOrderLine(orderLineId: $orderLineId) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	mutation removeAllOrderLines {
		removeAllOrderLines {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	query activeOrder {
		activeOrder {
			...CustomOrderDetail
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
	query orderByCode($code: String!) {
		orderByCode(code: $code) {
			...CustomOrderDetail
		}
	}
	${CustomOrderDetailFragment}
`;

gql`
    mutation transitionOrderToState($state: String!) {
        transitionOrderToState(state: $state) {
            ...CustomOrderDetail
            ... on OrderStateTransitionError {
                errorCode
                message
                fromState
                toState
                transitionError
            }
        }
    }
    ${CustomOrderDetailFragment}
`;

gql`
    mutation addPaymentToOrder($input: PaymentInput!) {
        addPaymentToOrder(input: $input) {
            ...CustomOrderDetail
            ... on ErrorResult {
                errorCode
                message
            }
        }
    }
    ${CustomOrderDetailFragment}
`;
