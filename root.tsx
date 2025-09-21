import { component$, useStyles$, useVisibleTask$ } from '@qwik.dev/core';
import { QwikRouterProvider, RouterOutlet, ServiceWorkerRegister } from '@qwik.dev/router';
import { Head } from './components/head/head';

import globalStyles from './global.css?inline';

// Import GraphQL interceptor to enable automatic reCAPTCHA token injection
import './utils/graphql-interceptor';

export default component$(() => {
	useStyles$(globalStyles);

	// 🚀 OPTIMIZED: Console suppression removed to prevent unnecessary hydration

	// 🚀 OPTIMIZED: Mobile Safari compatibility - runs on mobile Safari and iOS devices
	useVisibleTask$(() => {
		// Check for mobile Safari or iOS devices
		const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(/Safari/.test(navigator.userAgent) && /Mobile/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent));

		if (!isMobileSafari) return;

		// Enhanced viewport height fix for Safari
		const setVH = () => {
			const vh = window.innerHeight * 0.01;
			document.documentElement.style.setProperty('--vh', `${vh}px`);

			// Additional Safari-specific fixes
			document.documentElement.style.setProperty('--actual-height', `${window.innerHeight}px`);
		};

		const preventZoom = (e: Event) => {
			const target = e.target as HTMLElement;
			if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.style.fontSize !== '16px') {
				target.style.fontSize = '16px';
			}
		};

		// Set initial values
		setVH();

		// Listen for all possible viewport changes
		window.addEventListener('resize', setVH, { passive: true });
		window.addEventListener('orientationchange', () => {
			// Delay to ensure Safari has updated its viewport
			setTimeout(setVH, 100);
		}, { passive: true });
		window.addEventListener('scroll', setVH, { passive: true });
		document.addEventListener('focusin', preventZoom, { passive: true });

		return () => {
			window.removeEventListener('resize', setVH);
			window.removeEventListener('orientationchange', setVH);
			window.removeEventListener('scroll', setVH);
			document.removeEventListener('focusin', preventZoom);
		};
	});

	return (
		<QwikRouterProvider>
			<Head />
			<body lang="en">
				<RouterOutlet />
				<ServiceWorkerRegister />
			</body>
		</QwikRouterProvider>
	);
});
