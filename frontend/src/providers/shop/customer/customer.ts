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
import { shopSdk } from '~/graphql-wrapper';

// 🚀 CUSTOMER QUERY CACHE - 3-minute cache for customer data
const customerCache = new Map<string, { data: any; timestamp: number }>();
const CUSTOMER_CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

const getCachedCustomerQuery = (key: string) => {
	const cached = customerCache.get(key);
	if (cached && Date.now() - cached.timestamp < CUSTOMER_CACHE_DURATION) {
		return cached.data;
	}
	return null;
};

const setCachedCustomerQuery = (key: string, data: any) => {
	customerCache.set(key, { data, timestamp: Date.now() });
	// Keep customer cache reasonable
	if (customerCache.size > 30) {
		const oldestKey = customerCache.keys().next().value;
		if (oldestKey) {
			customerCache.delete(oldestKey);
		}
	}
};

// Clear customer cache when data changes (mutations)
const clearCustomerCache = () => {
	customerCache.clear();
};

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
	return shopSdk
		.updateCustomerPasswordMutation({ currentPassword, newPassword })
		.then((res: UpdateCustomerPasswordMutationMutation) => res.updateCustomerPassword);
};

export const deleteCustomerAddressMutation = async (id: string) => {
	return shopSdk.deleteCustomerAddress({ id });
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
	return shopSdk.updateCustomerAddressMutation({ input }, { token });
};

export const createCustomerAddressMutation = (
	input: CreateAddressInput,
	token: string | undefined
) => {
	return shopSdk.createCustomerAddressMutation({ input }, { token });
};

export const logoutMutation = async () => {
	return shopSdk.logout();
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

// 🚀 CACHED CUSTOMER QUERIES - Better performance for account pages

export const getActiveCustomerCached = async () => {
	const cacheKey = 'active-customer';
	const cached = getCachedCustomerQuery(cacheKey);
	if (cached) return cached;

	try {
		const result = await getActiveCustomerQuery();
		setCachedCustomerQuery(cacheKey, result);
		return result;
	} catch (error) {
		console.warn('Customer cache failed, using fallback:', error);
		const result = await getActiveCustomerQuery();
		setCachedCustomerQuery(cacheKey, result);
		return result;
	}
};

export const getActiveCustomerAddressesCached = async () => {
	const cacheKey = 'customer-addresses';
	const cached = getCachedCustomerQuery(cacheKey);
	if (cached) return cached;

	try {
		const result = await getActiveCustomerAddressesQuery();
		setCachedCustomerQuery(cacheKey, result);
		return result;
	} catch (error) {
		console.warn('Customer addresses cache failed, using fallback:', error);
		const result = await getActiveCustomerAddressesQuery();
		setCachedCustomerQuery(cacheKey, result);
		return result;
	}
};

export const getActiveCustomerOrdersCached = async () => {
	const cacheKey = 'customer-orders';
	const cached = getCachedCustomerQuery(cacheKey);
	if (cached) return cached;

	try {
		const result = await getActiveCustomerOrdersQuery();
		setCachedCustomerQuery(cacheKey, result);
		return result;
	} catch (error) {
		console.warn('Customer orders cache failed, using fallback:', error);
		const result = await getActiveCustomerOrdersQuery();
		setCachedCustomerQuery(cacheKey, result);
		return result;
	}
};

// Clear cache after mutations that change customer data
export const clearCustomerCacheAfterMutation = () => {
	clearCustomerCache();
};
