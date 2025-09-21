import { component$, useVisibleTask$ } from '@qwik.dev/core';
import { useLocalCart, refreshCartStock, loadCartIfNeeded } from '~/contexts/CartContext';
import Cart from './Cart';

interface ConditionalCartProps {
	isHomePage: boolean;
	showCart: boolean;
}

export default component$<ConditionalCartProps>(({ isHomePage, showCart }) => {
	const localCart = useLocalCart();

	// For non-homepage routes, ensure stock is refreshed on mount
	useVisibleTask$(async () => {
		if (!isHomePage) {
			// Load cart if needed first
			loadCartIfNeeded(localCart);
			
			// Then refresh stock if cart has items
			if (localCart.localCart.items.length > 0) {
				await refreshCartStock(localCart);
			}
		}
	});

	// Render logic based on page type
	if (!isHomePage) {
		// Non-homepage: Always show cart (stock refresh handled above)
		return <Cart />;
	} else {
		// Homepage: Only show cart when showCart is true
		return showCart ? <Cart /> : null;
	}
});