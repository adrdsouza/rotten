import { component$ } from '@qwik.dev/core';
import { useDocumentHead, useLocation } from '@qwik.dev/router';
import { DEFAULT_METADATA_TITLE } from '~/constants';
import { generateDocumentHead } from '~/utils';

interface HeadProps {
	nonce?: string;
}

export const Head = component$<HeadProps>(({ nonce }) => {
	const documentHead = useDocumentHead();
	const head =
		documentHead.meta.length > 0 ? documentHead : { ...documentHead, ...generateDocumentHead() };
	const loc = useLocation();

	return (
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
			<meta name="theme-color" content="#000000" />
			<meta name="theme-color" content="#000000" media="(prefers-color-scheme: light)" />
			<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
			<meta name="color-scheme" content="dark light" />
			<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

			{/* Inline style to ensure dark background for Safari status bar detection */}
			<style>{`
				html {
					background-color: #000000;
				}
				body {
					background-color: #ffffff;
					margin: 0;
					padding: 0;
				}
			`}</style>

			{/* iPhone Advanced Privacy Protection compatibility */}
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-title" content="Damned Designs" />
			<meta name="format-detection" content="telephone=no" />
			<meta name="msapplication-tap-highlight" content="no" />

			<meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
			<meta httpEquiv="X-Content-Type-Options" content="nosniff" />
			{/* Privacy-friendly tracking prevention */}
			<meta name="referrer" content="strict-origin-when-cross-origin" />
			<meta httpEquiv="Content-Security-Policy" content={`default-src 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; script-src 'self' https://cdn.jsdelivr.net${nonce ? ` 'nonce-${nonce}'` : ''}; connect-src 'self' https://demo.vendure.io https://services.sheerid.com https://auth.sheerid.com; frame-src 'self' https://services.sheerid.com; object-src 'none'; base-uri 'self';`} />

			{/* Disable problematic features that trigger privacy warnings */}
			<meta name="apple-touch-fullscreen" content="yes" />
			<meta name="mobile-web-app-capable" content="yes" />

			{/* Additional iOS privacy-friendly settings */}
			<meta name="apple-mobile-web-app-orientations" content="portrait" />
			<meta name="msapplication-TileColor" content="#000000" />
			<meta name="msapplication-config" content="none" />
			
			{/* 🚀 RESOURCE HINTS OPTIMIZATION - Critical external domains */}

			{/* Primary API domain */}
			<link rel="dns-prefetch" href="https://damneddesigns.com" />
			<link rel="preconnect" href="https://damneddesigns.com" crossOrigin="" />

			{/* Payment processors - critical for checkout performance */}
			<link rel="dns-prefetch" href="https://secure.nmi.com" />
			<link rel="preconnect" href="https://secure.nmi.com" crossOrigin="" />

			<link rel="dns-prefetch" href="https://gateway.sezzle.com" />
			<link rel="dns-prefetch" href="https://sandbox.gateway.sezzle.com" />


			{/* Geolocation services for address validation */}
			<link rel="dns-prefetch" href="https://ipapi.co" />
			<link rel="dns-prefetch" href="https://api.country.is" />
			<link rel="dns-prefetch" href="https://get.geojs.io" />

			{/* SheerID verification services */}
			<link rel="dns-prefetch" href="https://services.sheerid.com" />
			<link rel="preconnect" href="https://services.sheerid.com" crossOrigin="" />
			<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
			<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
			
			{/* Service Worker for iOS privacy optimization */}
			<script 
				{...(nonce ? { nonce } : {})}
				dangerouslySetInnerHTML={`
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

			{/* SheerID JavaScript Library CSS */}
			<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@sheerid/jslib@2/sheerid-install.css" type="text/css" crossOrigin="anonymous" />

			{/* SheerID JavaScript Library - ES Module */}
			<script type="module" src="/sheerid-loader.js"></script>

			{/* Favicon setup with dark/light mode support */}
			<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
			<link rel="icon" href="/favicon-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: light)" />
			<link rel="icon" href="/favicon-light.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)" />
			{/* Apple touch icon for iOS */}
			<link rel="apple-touch-icon" href="/favicon.svg" />
			

			<link rel="canonical" href={loc.url.toString()} />

			{head.meta.map((m, key) => (
				<meta key={key} {...m} />
			))}

			{(() => {
				const safeLinks = (head.links || []).filter((l: any) => {
					if (!l) return false;
					const rel = (l.rel || '').toLowerCase();
					if ((rel === 'modulepreload' || rel === 'preload') && !l.href) return false;
					if (rel === 'preload' && !l.as) return false;
					return true;
				});
				return safeLinks.map((l: any, key: number) => <link key={key} {...l} />);
			})()}

			{head.styles.map(({ key, style, ...props }) => (
				<style key={key} {...props} dangerouslySetInnerHTML={style ?? ''} />
			))}

			{/* JSON-LD Schema injection */}
			{(head as any).meta?.filter((m: any) => m.name?.startsWith('json-ld-')).map((jsonLdMeta: any, index: number) => (
				<script
					key={`jsonld-${index}`}
					type="application/ld+json"
					{...(nonce ? { nonce } : {})}
					dangerouslySetInnerHTML={jsonLdMeta.content || '{}'}
				/>
			))}			<meta name="description" content="Damned Designs" />
		</head>
	);
});
