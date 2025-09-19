import gql from 'graphql-tag';
import {
	ActiveCustomerAddressesQuery,
	ActiveCustomerOrdersQuery,
	ActiveCustomerOrdersQueryVariables,
	ActiveCustomerQuery,
	CreateAddressInput,
	Customer,
	UpdateAddressInput,
	UpdateCustomerPasswordMutationMutation,
} from '~/generated/graphql';
import {
	customerCache,
	clearCustomerCacheAfterMutation,
	clearCustomerCacheOnLogout,
} from '~/services/CustomerCacheService';
import { shopSdk } from '~/graphql-wrapper';



export const getActiveCustomerQuery = async () => {
	return shopSdk
		.activeCustomer()
		.then((res: ActiveCustomerQuery) => res.activeCustomer as Customer);
};

export const getActiveCustomerAddressesQuery = async () => {
	return shopSdk
		.activeCustomerAddresses()
		.then((res: ActiveCustomerAddressesQuery) => res.activeCustomer as Customer);
};

export const updateCustomerPasswordMutation = async (
	currentPassword: string,
	newPassword: string
) => {
	const result = await shopSdk
		.updateCustomerPasswordMutation({ currentPassword, newPassword })
		.then((res: UpdateCustomerPasswordMutationMutation) => res.updateCustomerPassword);
	
	// Password changes don't affect cached customer data, so no cache invalidation needed
	return result;
};

export const deleteCustomerAddressMutation = async (id: string) => {
	const result = await shopSdk.deleteCustomerAddress({ id });
	clearCustomerCacheAfterMutation(); // Invalidate cache after mutation
	return result;
};

export const getActiveCustomerOrdersQuery = async () => {
	const variables: ActiveCustomerOrdersQueryVariables = {
		options: {
			filter: {
				active: {
					eq: false,
				},
			},
			sort: {
				createdAt: 'DESC',
			},
		},
	};
	return shopSdk
		.activeCustomerOrders(variables)
		.then((res: ActiveCustomerOrdersQuery) => res.activeCustomer as Customer);
};

export const updateCustomerAddressMutation = async (
	input: UpdateAddressInput,
	token: string | undefined
) => {
	console.log(token);
	const result = await shopSdk.updateCustomerAddressMutation({ input }, { token });
	clearCustomerCacheAfterMutation(); // Invalidate cache after mutation
	return result;
};

export const createCustomerAddressMutation = async (
	input: CreateAddressInput,
	token: string | undefined
) => {
	const result = await shopSdk.createCustomerAddressMutation({ input }, { token });
	clearCustomerCacheAfterMutation(); // Invalidate cache after mutation
	return result;
};

export const logoutMutation = async () => {
	const result = await shopSdk.logout();
	clearCustomerCacheOnLogout(); // Clear all customer cache on logout
	return result;
};

gql`
	query activeCustomerAddresses {
		activeCustomer {
			id
			addresses {
				id
				fullName
				company
				streetLine1
				streetLine2
				city
				province
				postalCode
				country {
					code
				}
				phoneNumber
				defaultShippingAddress
				defaultBillingAddress
			}
		}
	}
`;

gql`
	query activeCustomer {
		activeCustomer {
			id
			title
			firstName
			lastName
			emailAddress
			phoneNumber
		}
	}
`;

gql`
	mutation createCustomerAddress($input: CreateAddressInput!) {
		createCustomerAddress(input: $input) {
			...Address
			__typename
		}
	}

	fragment Address on Address {
		id
		fullName
		company
		streetLine1
		streetLine2
		city
		province
		postalCode
		country {
			id
			code
			name
			__typename
		}
		phoneNumber
		defaultShippingAddress
		defaultBillingAddress
		__typename
	}
`;

gql`
	query activeCustomerOrders($options: OrderListOptions) {
		activeCustomer {
			id
			orders(options: $options) {
				items {
					id
					code
					state
					createdAt
					orderPlacedAt
					updatedAt
					totalWithTax
					subTotalWithTax
					shippingWithTax
					currencyCode
					couponCodes
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
						city
						province
						postalCode
						countryCode
						phoneNumber
					}
					shippingLines {
						priceWithTax
						shippingMethod {
							id
							name
							description
						}
					}
					fulfillments {
						id
						state
						method
						trackingCode
						createdAt
						updatedAt
						lines {
							orderLineId
							quantity
						}
					}
					payments {
						id
						method
						amount
						state
						transactionId
						createdAt
						metadata
					}
					lines {
						id
						quantity
						unitPriceWithTax
						linePriceWithTax
						discountedUnitPriceWithTax
						discountedLinePriceWithTax					featuredAsset {
						id
						preview
					}					productVariant {
						id
						name
						sku
						price
						options {
							name
						}
						product {
								id
								name
								slug
							}
						}
					}
					discounts {
						type
						description
						amountWithTax
					}
					taxSummary {
						description
						taxRate
						taxTotal
					}
				}
				totalItems
			}
		}
	}
`;

gql`
	mutation updateCustomerPasswordMutation($currentPassword: String!, $newPassword: String!) {
		updateCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
			... on Success {
				success
				__typename
			}
			...ErrorResult
			__typename
		}
	}

	fragment ErrorResult on ErrorResult {
		errorCode
		message
		__typename
	}
`;

gql`
	mutation deleteCustomerAddress($id: ID!) {
		deleteCustomerAddress(id: $id) {
			success
		}
	}
`;

gql`
	mutation updateCustomerAddressMutation($input: UpdateAddressInput!) {
		updateCustomerAddress(input: $input) {
			...Address
			__typename
		}
	}

	fragment Address on Address {
		id
		fullName
		company
		streetLine1
		streetLine2
		city
		province
		postalCode
		country {
			id
			code
			name
			__typename
		}
		phoneNumber
		defaultShippingAddress
		defaultBillingAddress
		__typename
	}
`;

gql`
	mutation createCustomerAddressMutation($input: CreateAddressInput!) {
		createCustomerAddress(input: $input) {
			...Address
			__typename
		}
	}

	fragment Address on Address {
		id
		fullName
		company
		streetLine1
		streetLine2
		city
		province
		postalCode
		country {
			id
			code
			name
			__typename
		}
		phoneNumber
		defaultShippingAddress
		defaultBillingAddress
		__typename
	}
`;

gql`
	mutation logout {
		logout {
			success
		}
	}
`;

// 🚀 CACHED CUSTOMER QUERIES - Now using unified CustomerCacheService

// Cached functions - now using unified CustomerCacheService
export const getActiveCustomerCached = () => customerCache.getProfile();
export const getActiveCustomerAddressesCached = () => customerCache.getAddresses();
export const getActiveCustomerOrdersCached = () => customerCache.getOrders();

// Export cache invalidation functions
export { clearCustomerCacheAfterMutation, clearCustomerCacheOnLogout };
