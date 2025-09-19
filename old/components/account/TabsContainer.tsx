import { Slot, component$ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import LockClosedIcon from '../icons/LockClosedIcon';
import MapPinIcon from '../icons/MapPinIcon';
import ShoppingBagIcon from '../icons/ShoppingBagIcon';
import UserIcon from '../icons/UserIcon';
import { Tab } from './Tab';

export const TabsContainer = component$(() => {
	const location = useLocation();
	return (
		<>
			<div class="border-b border-gray-200 mt-4">
				<ul class="flex justify-center sm:grid-0 sm:flex sm:flex-wrap -mb-px text-sm font-medium text-center text-gray-500">
					<Tab
						Icon={UserIcon}
						text="Account details"
						href="/account"
						isActive={location.url.pathname === '/account/'}
					/>

					<Tab
						Icon={ShoppingBagIcon}
						text="Purchase history"
						href="/account/orders"
						isActive={location.url.pathname.indexOf('orders') >= 0}
					/>

					<Tab
						Icon={MapPinIcon}
						text="Addresses"
						href="/account/address-book"
						isActive={location.url.pathname.indexOf('address-book') >= 0}
					/>

					<Tab
						Icon={LockClosedIcon}
						text="Password change"
						href="/account/password"
						isActive={location.url.pathname.indexOf('password') >= 0}
					/>
				</ul>
			</div>
			<Slot />
		</>
	);
});
