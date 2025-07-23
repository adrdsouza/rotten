import gql from 'graphql-tag';
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

export const removeOrderLineMutation = async (lineId: string) => {
	return shopSdk
		.removeOrderLine({ orderLineId: lineId })
		.then((res: RemoveOrderLineMutation) => res.removeOrderLine as Order);
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

// Custom coupon validation for local cart (bypasses SDK since schema isn't introspected)
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
	const { requester } = await import('~/utils/api');
	const { validateLocalCartCoupon } = await requester<
		{ validateLocalCartCoupon: any },
		{ input: typeof input }
	>(
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
		`,
		{ input },
	);
	return validateLocalCartCoupon;
};

export const setOrderBillingAddressMutation = async (input: CreateAddressInput) => {
	return shopSdk
		.setOrderBillingAddress({ input })
		.then((res: SetOrderBillingAddressMutation) => res.setOrderBillingAddress);
};

// TODO: Fix this - verifySezzlePayment exists in backend but codegen can't find it
// Function works at runtime even though codegen doesn't recognize the schema
export const verifySezzlePaymentMutation = async (orderCode: string): Promise<{ success: boolean; message: string }> => {
	const { requester } = await import('~/utils/api');
	const { verifySezzlePayment } = await requester<
		{ verifySezzlePayment: { success: boolean; message: string } },
		{ orderCode: string }
	>(
		gql`
			mutation verifySezzlePayment($orderCode: String!) {
				verifySezzlePayment(orderCode: $orderCode) {
					success
					message
				}
			}
		`,
		{ orderCode },
	);
	return verifySezzlePayment;
};

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
`;

gql`
	mutation removeCouponCode($couponCode: String!) {
		removeCouponCode(couponCode: $couponCode) {
			...CustomOrderDetail
		}
	}
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
`;

// Temporarily commented out until schema is generated
// gql`
// 	query validateLocalCartCoupon($input: ValidateLocalCartCouponInput!) {
// 		validateLocalCartCoupon(input: $input) {
// 			isValid
// 			validationErrors
// 			appliedCouponCode
// 			discountAmount
// 			discountPercentage
// 			freeShipping
// 			promotionName
// 			promotionDescription
// 		}
// 	}
// `;

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
`;

gql`
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
	mutation adjustOrderLine($orderLineId: ID!, $quantity: Int!) {
		adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
			...CustomOrderDetail
			... on ErrorResult {
				errorCode
				message
			}
		}
	}
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
`;

gql`
	query activeOrder {
		activeOrder {
			...CustomOrderDetail
		}
	}
`;

gql`
	query orderByCode($code: String!) {
		orderByCode(code: $code) {
			...CustomOrderDetail
		}
	}
`;
