import { component$, useContext, useSignal, useTask$ } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import AddressCard from '~/components/account/AddressCard';
import { AccountNav } from '~/components/account/AccountNav';
import { HighlightedButton } from '~/components/buttons/HighlightedButton';
import PlusIcon from '~/components/icons/PlusIcon';
import { APP_STATE } from '~/constants';
import {
	deleteCustomerAddressMutation,
	getActiveCustomerAddressesCached,
} from '~/providers/shop/customer/customer';
import { ShippingAddress } from '~/types';
import { createSEOHead } from '~/utils/seo';
import { LocalAddressService, LocalAddress } from '~/services/LocalAddressService';

// Transform LocalAddress to ShippingAddress format
const transformLocalToShippingAddress = (localAddress: LocalAddress): ShippingAddress => {
	return {
		id: localAddress.id,
		fullName: localAddress.fullName,
		streetLine1: localAddress.streetLine1,
		streetLine2: localAddress.streetLine2,
		company: localAddress.company,
		city: localAddress.city,
		province: localAddress.province,
		postalCode: localAddress.postalCode,
		countryCode: localAddress.countryCode,
		phoneNumber: localAddress.phoneNumber,
		defaultShippingAddress: localAddress.defaultShippingAddress,
		defaultBillingAddress: localAddress.defaultBillingAddress,
	};
};

export default component$(() => {
	const navigate = useNavigate();
	const appState = useContext(APP_STATE);

	// Load addresses using LocalAddressService
	const addresses = useSignal<ShippingAddress[]>([]);
	const isLoading = useSignal(true);

	// Load addresses on component mount
	useTask$(async () => {
		try {
				// Setup cross-tab sync for address updates
				LocalAddressService.setupCrossTabSync();

				if (appState.customer.id) {
				const cachedCustomer = await getActiveCustomerAddressesCached();
				if (cachedCustomer?.addresses) {
					const cachedAddresses = cachedCustomer.addresses.map(addr => ({
						id: addr.id,
						fullName: addr.fullName || '',
						streetLine1: addr.streetLine1,
						streetLine2: addr.streetLine2 || undefined,
						company: addr.company || undefined,
						city: addr.city || '',
						province: addr.province || '',
						postalCode: addr.postalCode || '',
						countryCode: addr.country.code,
						phoneNumber: addr.phoneNumber || undefined,
						defaultShippingAddress: addr.defaultShippingAddress || false,
						defaultBillingAddress: addr.defaultBillingAddress || false,
					}));
					addresses.value = cachedAddresses;
					isLoading.value = false;
				}
				
				await LocalAddressService.syncFromVendure(appState.customer.id);
			}

				// Get addresses from LocalAddressService and transform to ShippingAddress format
			const localAddresses = LocalAddressService.getAddresses();
			addresses.value = localAddresses.map(transformLocalToShippingAddress);
		} catch (error) {
			console.error('Error loading addresses:', error);
			// Fallback to empty array on error
			addresses.value = [];
		} finally {
			isLoading.value = false;
		}
	});

	// Setup address update listener for cross-tab sync
	useTask$(() => {
		const unsubscribe = LocalAddressService.onAddressUpdate(() => {
			// Reload addresses when they change in another tab
			const localAddresses = LocalAddressService.getAddresses();
			addresses.value = localAddresses.map(transformLocalToShippingAddress);
		});

		// Cleanup on component unmount
		return unsubscribe;
	});
	if (isLoading.value) {
		return (
			<>
				<AccountNav />
				<div class="max-w-6xl m-auto rounded-lg p-4 space-y-4">
					<div class="flex justify-center items-center h-32">
						<div class="text-gray-500">Loading addresses...</div>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<AccountNav />
			<div class="max-w-6xl m-auto rounded-lg p-4 space-y-4">
				<div class="mb-8">
					<h1 class="text-3xl font-bold tracking-tight text-gray-900">
						Address Book
					</h1>
					<p class="mt-2 text-gray-600">
						Manage your shipping and billing addresses
					</p>
				</div>
				{addresses.value.length > 0 ? (
					<div class="flex flex-wrap gap-6 justify-evenly">
						{addresses.value.map((address) => (
							<div class="min-w-[20rem]" key={address.id}>
								<AddressCard
									address={address}
									onDelete$={async (id) => {
										try {
											// Delete from Vendure backend
											await deleteCustomerAddressMutation(id);
											// Remove from LocalAddressService
											LocalAddressService.removeAddress(id);
											// Update local state
											addresses.value = addresses.value.filter((a) => a.id !== id);
										} catch (error) {
											console.error('Failed to delete address:', error);
										}
									}}
								/>
							</div>
						))}
					</div>
				) : (
					<div class="flex justify-center items-center h-32">
						<div class="text-gray-500">No addresses found. Add your first address below.</div>
					</div>
				)}				<div class="flex justify-center">
					<HighlightedButton
						onClick$={() => {
							navigate('/account/address-book/add/');
						}}
					>
						<PlusIcon /> &nbsp; New Address
					</HighlightedButton>
				</div>
			</div>
		</>
	);
});

export const head = () => {
	return createSEOHead({
		title: 'Address Book',
		description: 'Manage your shipping and billing addresses.',
		noindex: true,
	});
};
