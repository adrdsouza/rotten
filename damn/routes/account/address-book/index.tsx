import { component$, useContext, useSignal } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import AddressCard from '~/components/account/AddressCard';
import { AccountNav } from '~/components/account/AccountNav';
import { HighlightedButton } from '~/components/buttons/HighlightedButton';
import PlusIcon from '~/components/icons/PlusIcon';
import { APP_STATE } from '~/constants';
import {
	deleteCustomerAddressMutation,
} from '~/providers/shop/customer/customer';
import { ShippingAddress } from '~/types';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
	const navigate = useNavigate();
	const appState = useContext(APP_STATE);

	// Use addresses from SSR data (loaded in layout) - already converted to ShippingAddress format
	const shippingAddresses: ShippingAddress[] = appState.addressBook;

	const activeCustomerAddresses = useSignal<{ id: string; addresses: ShippingAddress[] }>({
		id: appState.customer.id,
		addresses: shippingAddresses
	});
	return activeCustomerAddresses.value ? (
		<>
			<AccountNav />
			<div class="max-w-6xl m-auto rounded-lg p-4 space-y-4">
				<div class="flex flex-wrap gap-6 justify-evenly">
					{[...appState.addressBook].map((address) => (
						<div class="min-w-[20rem]" key={address.id}>
							<AddressCard
								address={address}
								onDelete$={async (id) => {
									try {
										await deleteCustomerAddressMutation(id);
										// Optimistically update state without full page reload
										appState.addressBook = appState.addressBook.filter((a) => a.id !== id);
									} catch (error) {
										console.error('Failed to delete address:', error);
									}
								}}
							/>
						</div>
					))}
				</div>				<div class="flex justify-center">
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
	) : (
		<>
			<AccountNav />
			<div class="h-screen" />
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
