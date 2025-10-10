import { component$ } from '@qwik.dev/core';
import Cart from './Cart';

interface ConditionalCartProps {
	isHomePage: boolean;
	showCart: boolean;
}

export default component$<ConditionalCartProps>(({ isHomePage, showCart }) => {
	// 🚀 SIMPLIFIED: No stock refresh needed here
	// Stock refresh happens when cart button is clicked (in header)
	// Cart context is already loaded eagerly by CartProvider

	// Render logic based on page type
	if (!isHomePage) {
		// Non-homepage: Always show cart (checkout page has persistent cart)
		return <Cart />;
	} else {
		// Homepage: Only show cart when showCart is true
		return showCart ? <Cart /> : null;
	}
});