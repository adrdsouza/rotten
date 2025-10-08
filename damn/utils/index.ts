import {
	DEFAULT_METADATA_DESCRIPTION,
	DEFAULT_METADATA_IMAGE,
	DEFAULT_METADATA_TITLE,
	DEFAULT_METADATA_URL,
	DEFAULT_CURRENCY,
} from '~/constants';
import { ENV_VARIABLES } from '~/env';
import { SearchResponse } from '~/generated/graphql';
import { ActiveCustomer, FacetWithValues, ShippingAddress } from '~/types';
import { validatePostalCode, validateName, validateEmail, validateAddress, validateStateProvince } from '~/utils/cached-validation';

export const getRandomInt = (max: number) => Math.floor(Math.random() * max);

export function formatPrice(value = 0, currencyCode?: string) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currencyCode || DEFAULT_CURRENCY,
	}).format(value / 100);
}

export function formatCustomPrice(value = 0, currencyCode?: string) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currencyCode || DEFAULT_CURRENCY,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

export const groupFacetValues = (
	search: SearchResponse,
	activeFacetValueIds: string[]
): FacetWithValues[] => {
	if (!search) {
		return [];
	}
	const facetMap = new Map<string, FacetWithValues>();
	for (const {
		facetValue: { id, name, facet },
		count,
	} of search.facetValues) {
		if (count === search.totalItems) {
			continue;
		}
		const facetFromMap = facetMap.get(facet.id);
		const selected = (activeFacetValueIds || []).includes(id);
		if (facetFromMap) {
			facetFromMap.values.push({ id, name, selected });
		} else {
			facetMap.set(facet.id, {
				id: facet.id,
				name: facet.name,
				open: true,
				values: [{ id, name, selected }],
			});
		}
	}
	return Array.from(facetMap.values());
};

export const enableDisableFacetValues = (_facetValues: FacetWithValues[], ids: string[]) => {
	const facetValueIds: string[] = [];
	const facetValues = _facetValues.map((facet) => {
		facet.values = facet.values.map((value) => {
			if (ids.includes(value.id)) {
				facetValueIds.push(value.id);
				value.selected = true;
			} else {
				value.selected = false;
			}
			return value;
		});
		return facet;
	});
	return { facetValues, facetValueIds };
};

export const changeUrlParamsWithoutRefresh = (collectionSlug: string, facetValueIds: string[], term: string) => {
  const params = new URLSearchParams();
  if (term) {
    params.set('q', term);
  }
  if (facetValueIds && facetValueIds.length > 0) {
    params.set('f', facetValueIds.join('-'));
  }
  if (collectionSlug) {
    params.set('c', collectionSlug);
  }

  const queryString = params.toString();
  const newUrl = `${window.location.origin}${window.location.pathname}${queryString ? `?${queryString}` : ''}`;

  return window.history.pushState('', '', newUrl);
};

export const setCookie = (name: string, value: string, days: number) => {
	let expires = '';
	if (days) {
		const date = new Date();
		date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
		expires = '; expires=' + date.toUTCString();
	}
	const secureCookie = isEnvVariableEnabled('VITE_SECURE_COOKIE')
		? ' Secure; SameSite=Strict;'
		: '';
	document.cookie = name + '=' + (value || '') + expires + `;${secureCookie} path=/`;
};

export const getCookie = (name: string) => {
	const keyValues = document.cookie.split(';');
	let result = '';
	keyValues.forEach((item) => {
		const [key, value] = item.split('=');
		if (key.trim() === name) {
			result = value;
		}
	});
	return result;
};

export const cleanUpParams = (params: Record<string, string>) => {
	if ('slug' in params && params.slug[params.slug.length - 1] === '/') {
		params.slug = params.slug.slice(0, params.slug.length - 1);
	}
	return params;
};

export const isEnvVariableEnabled = (envVariable: keyof typeof ENV_VARIABLES) =>
	ENV_VARIABLES[envVariable] === 'true';

export const isShippingAddressValid = (orderAddress: ShippingAddress): boolean => {
	if (!orderAddress) return false;
	
	// Use the SAME validation functions that the AddressForm component uses
	const streetResult = validateAddress(orderAddress.streetLine1 || '', 'Street address');
	const cityResult = validateName(orderAddress.city || '', 'City');
	const provinceResult = validateStateProvince(orderAddress.province || '', orderAddress.countryCode || 'US', 'State/Province');
	const postalResult = validatePostalCode(orderAddress.postalCode || '', orderAddress.countryCode || 'US');
	
	// Log validation results for debugging
	// console.log('📋 isShippingAddressValid check:', {
	// 	street: { value: orderAddress.streetLine1, valid: streetResult.isValid },
	// 	city: { value: orderAddress.city, valid: cityResult.isValid },
	// 	province: { value: orderAddress.province, valid: provinceResult.isValid },
	// 	postal: { value: orderAddress.postalCode, valid: postalResult.isValid },
	// 	country: { value: orderAddress.countryCode, valid: !!orderAddress.countryCode }
	// });
	
	// Check if basic required fields pass validation (phone is handled separately in customer details)
	const basicFieldsValid = streetResult.isValid && cityResult.isValid && provinceResult.isValid && postalResult.isValid && !!orderAddress.countryCode;
	
	return basicFieldsValid;
};

export const isBillingAddressValid = (billingAddress: ShippingAddress): boolean => {
	if (!billingAddress) return false;
	
	// Use the SAME validation functions that the BillingAddressForm component uses
	const streetResult = validateAddress(billingAddress.streetLine1 || '', 'Street address');
	const cityResult = validateName(billingAddress.city || '', 'City');
	const provinceResult = validateStateProvince(billingAddress.province || '', billingAddress.countryCode || 'US', 'State/Province');
	const postalResult = validatePostalCode(billingAddress.postalCode || '', billingAddress.countryCode || 'US');
	
	// Log validation results for debugging
	console.log('🏢 isBillingAddressValid check:', {
		street: { value: billingAddress.streetLine1, valid: streetResult.isValid },
		city: { value: billingAddress.city, valid: cityResult.isValid },
		province: { value: billingAddress.province, valid: provinceResult.isValid },
		postal: { value: billingAddress.postalCode, valid: postalResult.isValid },
		country: { value: billingAddress.countryCode, valid: !!billingAddress.countryCode }
	});
	
	// Check if basic required fields pass validation
	const basicFieldsValid = streetResult.isValid && cityResult.isValid && provinceResult.isValid && postalResult.isValid && !!billingAddress.countryCode;
	
	return basicFieldsValid;
};

export const isActiveCustomerValid = (activeCustomer: ActiveCustomer | null | undefined): boolean => {
	// Early return if activeCustomer is null or undefined
	if (!activeCustomer) {
		// console.log('[isActiveCustomerValid] activeCustomer is null or undefined');
		return false;
	}

	// console.log('[isActiveCustomerValid] Validating customer:', {
	// 	activeCustomer,
	// 	hasFirstName: !!activeCustomer.firstName,
	// 	hasLastName: !!activeCustomer.lastName,
	// 	hasEmailAddress: !!activeCustomer.emailAddress,
	// 	emailValue: activeCustomer.emailAddress
	// });

	if (!activeCustomer.firstName || !activeCustomer.lastName || !activeCustomer.emailAddress) {
		// console.log('[isActiveCustomerValid] Failed basic field check');
		return false;
	}

	// Validate email format using the validateEmail function
	const emailResult = validateEmail(activeCustomer.emailAddress);
	// console.log('[isActiveCustomerValid] Email validation result:', emailResult);
	return emailResult.isValid;
};

export const fullNameWithTitle = ({
	title,
	firstName,
	lastName,
}: Pick<ActiveCustomer, 'title' | 'firstName' | 'lastName'>): string => {
	return [title, firstName, lastName].filter((x) => !!x).join(' ');
};

export const formatDateTime = (dateToConvert: Date) => {
	const result = new Date(dateToConvert).toISOString();
	const [date, time] = result.split('T');
	const [hour, minutes] = time.split(':');
	const orderedDate = date.split('-').reverse().join('-');
	return `${orderedDate} ${hour}:${minutes}`;
};

export const isCheckoutPage = (url: string) => url.includes('/checkout');

export const generateDocumentHead = (
	url = DEFAULT_METADATA_URL,
	title = DEFAULT_METADATA_TITLE,
	description = DEFAULT_METADATA_DESCRIPTION,
	image = DEFAULT_METADATA_IMAGE
) => {
	const OG_METATAGS = [
		{ property: 'og:type', content: 'website' },
		{ property: 'og:url', content: url },
		{ property: 'og:title', content: title },
		{
			property: 'og:description',
			content: description,
		},
		{
			property: 'og:image',
			content: image ? image + '?preset=xl' : undefined,
		},
	];
	const TWITTER_METATAGS = [
		{ property: 'twitter:card', content: 'summary_large_image' },
		{ property: 'twitter:url', content: url },
		{ property: 'twitter:title', content: title },
		{
			property: 'twitter:description',
			content: description,
		},
		{
			property: 'twitter:image',
			content: image ? image + '?preset=xl' : undefined,
		},
	];
	return { title, meta: [...OG_METATAGS, ...TWITTER_METATAGS] };
};
