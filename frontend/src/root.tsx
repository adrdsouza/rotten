import { component$, useStyles$, useVisibleTask$ } from '@qwik.dev/core';
import { QwikRouterProvider, RouterOutlet, ServiceWorkerRegister } from '@qwik.dev/router';
import { Head } from './components/head/head';

import globalStyles from './global.css?inline';

// Import GraphQL interceptor to enable automatic reCAPTCHA token injection
import './utils/graphql-interceptor';

export default component$(() => {
	useStyles$(globalStyles);

	// 🚀 OPTIMIZED: Console suppression removed to prevent unnecessary hydration

	// 🚀 OPTIMIZED: iOS compatibility - only runs on iOS devices
	useVisibleTask$(() => {
		// Early exit for non-iOS devices to avoid unnecessary work
		if (!/iPad|iPhone|iPod/.test(navigator.userAgent)) return;

		// Minimal iOS fixes - only essential viewport and zoom prevention
		const setVH = () => document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
		const preventZoom = (e: Event) => {
			const target = e.target as HTMLElement;
			if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.style.fontSize !== '16px') {
				target.style.fontSize = '16px';
			}
		};

		setVH();
		window.addEventListener('resize', setVH, { passive: true });
		window.addEventListener('orientationchange', setVH, { passive: true });
		document.addEventListener('focusin', preventZoom, { passive: true });

		return () => {
			window.removeEventListener('resize', setVH);
			window.removeEventListener('orientationchange', setVH);
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
