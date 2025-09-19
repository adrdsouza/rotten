import { component$ } from '@qwik.dev/core';
import { useDocumentHead, useLocation } from '@qwik.dev/router';
import { DEFAULT_METADATA_TITLE } from '~/constants';
import { generateDocumentHead } from '~/utils';

export const Head = component$(() => {
	const documentHead = useDocumentHead();
	const head =
		documentHead.meta.length > 0 ? documentHead : { ...documentHead, ...generateDocumentHead() };
	const loc = useLocation();

	return (
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
			<meta name="theme-color" content="#1a1a1a" />
			<meta name="theme-color" content="#2a2a2a" media="(prefers-color-scheme: light)" />
			<meta name="theme-color" content="#1a1a1a" media="(prefers-color-scheme: dark)" />
			<meta name="color-scheme" content="dark light" />
			<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

			{/* Inline style to ensure dark background for Safari status bar detection */}
			<style>{`
				html {
					background-color: #1a1a1a;
				}
				body {
					background-color: transparent;
					margin: 0;
					padding: 0;
				}
			`}</style>

			{/* iPhone Advanced Privacy Protection compatibility */}
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-title" content="Rotten Hand" />
			<meta name="format-detection" content="telephone=no" />
			<meta name="msapplication-tap-highlight" content="no" />

			{/* Privacy-friendly tracking prevention */}
			<meta name="referrer" content="strict-origin-when-cross-origin" />
			<meta httpEquiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://demo.vendure.io;" />

			{/* Disable problematic features that trigger privacy warnings */}
			<meta name="apple-touch-fullscreen" content="yes" />
			<meta name="mobile-web-app-capable" content="yes" />

			{/* Additional iOS privacy-friendly settings */}
			<meta name="apple-mobile-web-app-orientations" content="portrait" />
			<meta name="msapplication-TileColor" content="#000000" />
			<meta name="msapplication-config" content="none" />
			
			{/* 🚀 RESOURCE HINTS OPTIMIZATION - Critical external domains */}

			{/* Primary API domain */}
			<link rel="dns-prefetch" href="https://rottenhand.com" />
			<link rel="preconnect" href="https://rottenhand.com" crossOrigin="" />

			{/* Payment processors - critical for checkout performance */}
			<link rel="dns-prefetch" href="https://secure.nmi.com" />
			<link rel="preconnect" href="https://secure.nmi.com" crossOrigin="" />

			<link rel="dns-prefetch" href="https://gateway.sezzle.com" />
			<link rel="dns-prefetch" href="https://sandbox.gateway.sezzle.com" />

			{/* Google services - reCAPTCHA and other integrations */}
			<link rel="dns-prefetch" href="https://www.google.com" />
			<link rel="preconnect" href="https://www.google.com" crossOrigin="" />

			{/* Geolocation services for address validation */}
			<link rel="dns-prefetch" href="https://ipapi.co" />
			<link rel="dns-prefetch" href="https://api.country.is" />
			<link rel="dns-prefetch" href="https://get.geojs.io" />
			
			{/* Service Worker for iOS privacy optimization */}
			<script dangerouslySetInnerHTML={`
				if ('serviceWorker' in navigator && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
					window.addEventListener('load', () => {
						navigator.serviceWorker.register('/ios-privacy-sw.js')
							.catch(() => {
								// Silent fail - service workers are optional
							});
					});
				}
			`} />
			<title>{head.title || DEFAULT_METADATA_TITLE}</title>

			<link rel="manifest" href="/manifest.json" />
			{/* Optimized font preloading - only critical fonts to avoid browser warnings */}
			<link rel="preload" href="/fonts/inter/inter-v19-latin-regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
			<link rel="preload" href="/fonts/playfair-display/playfair-display-v37-latin-700.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />

			{/* Favicon setup */}
			<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			{/* Apple touch icon for iOS */}
			<link rel="apple-touch-icon" href="/favicon.svg" />
			

			<link rel="canonical" href={loc.url.toString()} />

			{head.meta.map((m, key) => (
				<meta key={key} {...m} />
			))}

			{head.links.map((l, key) => (
				<link key={key} {...l} />
			))}

			{head.styles.map(({ key, style, ...props }) => (
				<style key={key} {...props} dangerouslySetInnerHTML={style} />
			))}

			<meta name="description" content="Rotten Hand" />
		</head>
	);
});
