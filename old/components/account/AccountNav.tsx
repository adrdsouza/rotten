import { component$ } from '@qwik.dev/core';
import { Link, useLocation } from '@qwik.dev/router';
import ShoppingBagIcon from '~/components/icons/ShoppingBagIcon';
import HeartIcon from '~/components/icons/HeartIcon';
import MapPinIcon from '~/components/icons/MapPinIcon';
import LockClosedIcon from '~/components/icons/LockClosedIcon';
import HomeIcon from '~/components/icons/HomeIcon';

const navLinks = [
	{
		title: 'Dashboard',
		href: '/account',
		icon: HomeIcon,
	},
	{
		title: 'Orders',
		href: '/account/orders',
		icon: ShoppingBagIcon,
	},
	{
		title: 'Addresses',
		href: '/account/address-book',
		icon: MapPinIcon,
	},
	{
		title: 'Password',
		href: '/account/password',
		icon: LockClosedIcon,
	},
	{
		title: 'Support',
		href: '/contact',
		icon: HeartIcon,
	},
];

export const AccountNav = component$(() => {
	const location = useLocation();
	
	return (
		<nav class="w-full bg-white/80 backdrop-blur border-b border-gray-100 rounded-b-xl shadow-sm">
			<div class="grid grid-cols-5 gap-0 py-2">
				{navLinks.map((link) => {
					// Normalize paths by removing trailing slashes for comparison
					const currentPath = location.url.pathname.replace(/\/$/, '') || '/';
					const linkPath = link.href.replace(/\/$/, '') || '/';
					const isActive = currentPath === linkPath;
					
					return (
						<Link
							key={link.title}
							href={link.href}
							class={`flex flex-col items-center justify-center px-2 py-3 min-h-[80px] transition-all duration-200 cursor-pointer ${
								isActive 
									? 'bg-[#8a6d4a] text-white'
									: 'hover:bg-gray-50 text-gray-700'
							}`}
						>
							<div class={`w-6 h-6 mb-1 flex items-center justify-center ${
								isActive ? 'text-white' : 'text-gray-600'
							}`}>
								<link.icon />
							</div>
							<span class={`text-xs font-medium text-center leading-tight ${
								isActive 
									? 'text-white' 
									: 'text-gray-700'
							}`}>
								{link.title}
							</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
});

export default AccountNav;
