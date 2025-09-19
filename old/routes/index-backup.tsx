// 🚀 BACKUP: Original homepage saved as index-backup.tsx
import { component$, useStylesScoped$, useResource$, Resource } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { createSEOHead } from '~/utils/seo';
import { useViewportLoading } from '~/hooks/useLazySection';

// 🚀 LAZY LOADING OPTIMIZATION - Load below-the-fold components on demand

// 🚀 OPTIMIZED: Lazy Reviews Section using shared intersection observer hook
const LazyReviewsSection = component$(() => {
	const { elementRef, shouldLoad } = useViewportLoading({ rootMargin: '100px', threshold: 0.1 });

	// Resource for lazy loading the component
	const reviewsResource = useResource$(async ({ track }) => {
		const load = track(() => shouldLoad.value);
		if (!load) return null;

		const { ReviewsSection } = await import('~/components/home/ReviewsSection');
		return ReviewsSection;
	});

	return (
		<div ref={elementRef}>
			<Resource
				value={reviewsResource}
				onPending={() => (
					<div class="bg-white/95 backdrop-blur-sm p-6 sm:p-8 lg:p-10 rounded-lg shadow-2xl lg:col-span-1">
						<div>
							<div class="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
							<div class="space-y-3">
								<div class="h-4 bg-gray-200 rounded w-full"></div>
								<div class="h-4 bg-gray-200 rounded w-3/4"></div>
								<div class="h-4 bg-gray-200 rounded w-1/2"></div>
							</div>
						</div>
					</div>
				)}
				onRejected={(error) => (
					<div class="bg-red-50 border border-red-200 rounded-lg p-6">
						<div class="text-red-600">Failed to load reviews: {error.message}</div>
					</div>
				)}
				onResolved={(ReviewsComponent) => ReviewsComponent ? <ReviewsComponent /> : null}
			/>
		</div>
	);
});

// 🚀 OPTIMIZED: Lazy Features Section using shared intersection observer hook
const LazyFeaturesSection = component$(() => {
	const { elementRef, shouldLoad } = useViewportLoading({ rootMargin: '100px', threshold: 0.1 });

	const featuresResource = useResource$(async ({ track }) => {
		const load = track(() => shouldLoad.value);
		if (!load) return null;

		const { FeaturesSection } = await import('~/components/home/FeaturesSection');
		return FeaturesSection;
	});

	return (
		<div ref={elementRef}>
			<Resource
				value={featuresResource}
				onPending={() => (
					<div class="bg-white/95 backdrop-blur-sm p-6 sm:p-8 lg:p-10 rounded-lg shadow-2xl lg:col-span-1">
						<div>
							<div class="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
							<div class="space-y-3">
								<div class="h-4 bg-gray-200 rounded w-full"></div>
								<div class="h-4 bg-gray-200 rounded w-4/5"></div>
								<div class="h-4 bg-gray-200 rounded w-3/5"></div>
							</div>
						</div>
					</div>
				)}
				onRejected={(error) => (
					<div class="bg-red-50 border border-red-200 rounded-lg p-6">
						<div class="text-red-600">Failed to load features: {error.message}</div>
					</div>
				)}
				onResolved={(FeaturesComponent) => FeaturesComponent ? <FeaturesComponent /> : null}
			/>
		</div>
	);
});

// 🚀 OPTIMIZED: Lazy Brand Story Section using shared intersection observer hook
const LazyBrandStorySection = component$(() => {
	const { elementRef, shouldLoad } = useViewportLoading({ rootMargin: '100px', threshold: 0.1 });

	const brandStoryResource = useResource$(async ({ track }) => {
		const load = track(() => shouldLoad.value);
		if (!load) return null;

		const { BrandStorySection } = await import('~/components/home/BrandStorySection');
		return BrandStorySection;
	});

	return (
		<div ref={elementRef}>
			<Resource
				value={brandStoryResource}
				onPending={() => (
					<div class="bg-white/95 backdrop-blur-sm p-6 sm:p-8 lg:p-10 rounded-lg shadow-2xl">
						<div>
							<div class="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
							<div class="space-y-4">
								<div class="h-4 bg-gray-200 rounded w-full"></div>
								<div class="h-4 bg-gray-200 rounded w-5/6"></div>
								<div class="h-4 bg-gray-200 rounded w-4/5"></div>
								<div class="h-10 bg-gray-200 rounded w-1/3 mt-6"></div>
							</div>
						</div>
					</div>
				)}
				onRejected={(error) => (
					<div class="bg-red-50 border border-red-200 rounded-lg p-6">
						<div class="text-red-600">Failed to load brand story: {error.message}</div>
					</div>
				)}
				onResolved={(BrandStoryComponent) => BrandStoryComponent ? <BrandStoryComponent /> : null}
			/>
		</div>
	);
});

// Import images for optimization - Vite will handle AVIF/WebP/JPEG conversion and optimization
// HERO SECTION
import HeroImage_480 from '~/media/hero.png?format=avif&width=480&quality=85&url';
import HeroImage_768 from '~/media/hero.png?format=avif&width=768&quality=85&url';
import HeroImage_1024 from '~/media/hero.png?format=avif&width=1024&quality=85&url';
import HeroImage_1600 from '~/media/hero.png?format=avif&width=1600&quality=85&url';
import HeroImage_2000 from '~/media/hero.png?format=avif&width=2000&quality=85&url';
import HeroImageWebP_480 from '~/media/hero.png?format=webp&width=480&quality=85&url';
import HeroImageWebP_768 from '~/media/hero.png?format=webp&width=768&quality=85&url';
import HeroImageWebP_1024 from '~/media/hero.png?format=webp&width=1024&quality=85&url';
import HeroImageWebP_1600 from '~/media/hero.png?format=webp&width=1600&quality=85&url';
import HeroImageWebP_2000 from '~/media/hero.png?format=webp&width=2000&quality=85&url';
import HeroImageJPEG_480 from '~/media/hero.png?format=jpeg&width=480&quality=95&url';
import HeroImageJPEG_768 from '~/media/hero.png?format=jpeg&width=768&quality=95&url';
import HeroImageJPEG_1024 from '~/media/hero.png?format=jpeg&width=1024&quality=95&url';
import HeroImageJPEG_1600 from '~/media/hero.png?format=jpeg&width=1600&quality=95&url';
import HeroImageJPEG_2000 from '~/media/hero.png?format=jpeg&width=2000&quality=95&url';
// SECTION 2
import Section2Image_480 from '~/media/2.png?format=avif&width=480&quality=85&url';
import Section2Image_768 from '~/media/2.png?format=avif&width=768&quality=85&url';
import Section2Image_1024 from '~/media/2.png?format=avif&width=1024&quality=85&url';
import Section2Image_1600 from '~/media/2.png?format=avif&width=1600&quality=85&url';
import Section2Image_2000 from '~/media/2.png?format=avif&width=2000&quality=85&url';
import Section2ImageWebP_480 from '~/media/2.png?format=webp&width=480&quality=85&url';
import Section2ImageWebP_768 from '~/media/2.png?format=webp&width=768&quality=85&url';
import Section2ImageWebP_1024 from '~/media/2.png?format=webp&width=1024&quality=85&url';
import Section2ImageWebP_1600 from '~/media/2.png?format=webp&width=1600&quality=85&url';
import Section2ImageWebP_2000 from '~/media/2.png?format=webp&width=2000&quality=85&url';
import Section2ImageJPEG_480 from '~/media/2.png?format=jpeg&width=480&quality=95&url';
import Section2ImageJPEG_768 from '~/media/2.png?format=jpeg&width=768&quality=95&url';
import Section2ImageJPEG_1024 from '~/media/2.png?format=jpeg&width=1024&quality=95&url';
import Section2ImageJPEG_1600 from '~/media/2.png?format=jpeg&width=1600&quality=95&url';
import Section2ImageJPEG_2000 from '~/media/2.png?format=jpeg&width=2000&quality=95&url';
// SECTION 3
import HomeLast_480 from '~/media/homelast.png?format=avif&width=480&quality=85&url';
import HomeLast_768 from '~/media/homelast.png?format=avif&width=768&quality=85&url';
import HomeLast_1024 from '~/media/homelast.png?format=avif&width=1024&quality=85&url';
import HomeLast_1600 from '~/media/homelast.png?format=avif&width=1600&quality=85&url';
import HomeLast_2000 from '~/media/homelast.png?format=avif&width=2000&quality=85&url';
import HomeLastWebP_480 from '~/media/homelast.png?format=webp&width=480&quality=85&url';
import HomeLastWebP_768 from '~/media/homelast.png?format=webp&width=768&quality=85&url';
import HomeLastWebP_1024 from '~/media/homelast.png?format=webp&width=1024&quality=85&url';
import HomeLastWebP_1600 from '~/media/homelast.png?format=webp&width=1600&quality=85&url';
import HomeLastWebP_2000 from '~/media/homelast.png?format=webp&width=2000&quality=85&url';
import HomeLastJPEG_480 from '~/media/homelast.png?format=jpeg&width=480&quality=95&url';
import HomeLastJPEG_768 from '~/media/homelast.png?format=jpeg&width=768&quality=95&url';
import HomeLastJPEG_1024 from '~/media/homelast.png?format=jpeg&width=1024&quality=95&url';
import HomeLastJPEG_1600 from '~/media/homelast.png?format=jpeg&width=1600&quality=95&url';
import HomeLastJPEG_2000 from '~/media/homelast.png?format=jpeg&width=2000&quality=95&url';

// Define styles for clean vertical scroll layout
const SLIDER_STYLES = `
 /* Prevent horizontal scroll */
 html, body {
   overflow-x: hidden;
 }
 
 .slider-image {
   image-rendering: -webkit-optimize-contrast;
   image-rendering: crisp-edges;
   backface-visibility: hidden;
   transform: translateZ(0);
   will-change: transform;
 }
 
 @supports (-webkit-touch-callout: none) {
   .slider-image {
     transform: translate3d(0,0,0);
     -webkit-transform-style: preserve-3d;
   }
 }
 
 .hero-overlay {
   background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0) 60%);
 }
 
 .feature-card {
   transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
 }
 
 .feature-card:hover {
   transform: translateY(-4px);
   box-shadow: 0 20px 40px rgba(0,0,0,0.1);
 }
 
 /* Clean vertical scroll sections - all full screen */
 .page-section {
   min-height: 100vh;
   width: 100%;
   position: relative;
   display: flex;
   flex-direction: column;
 }
 
 /* Hero section specific height and positioning */
 .hero-section {
   /* Mobile: 70vh to account for Safari URL bar */
   height: 70vh;
   min-height: 500px;
 }
 
 /* Desktop: full height */
 @media (min-width: 1024px) {
   .hero-section {
     height: 100vh;
   }
 }
 
 /* Use dynamic viewport height on supported browsers */
 @supports (height: 100dvh) {
   .hero-section {
     height: 70dvh;
   }
   @media (min-width: 1024px) {
     .hero-section {
       height: 100dvh;
     }
   }
 }
 
 /* Small screens OR touch devices: Make hero section full height and ensure proper content positioning */
 @media (max-width: 1023px) {
   .page-section.hero-section {
     height: 100vh !important;
     min-height: 100vh !important;
     display: flex;
     flex-direction: column;
   }
   
   /* Use dynamic viewport height on supported browsers for small screens */
   @supports (height: 100dvh) {
     .page-section.hero-section {
       height: 100dvh !important;
       min-height: 100dvh !important;
     }
   }
   
   /* Ensure hero content container takes full height and positions content at bottom */
   .page-section.hero-section > div:last-child {
     height: 100% !important;
     display: flex !important;
     flex-direction: column !important;
     justify-content: flex-end !important;
   }
 }
 
 /* Use dynamic viewport height on supported browsers */
 @supports (height: 100dvh) {
   .page-section {
     min-height: 100dvh;
   }
 }

 /* Vertical scroll container */
 .vertical-scroll-container {
   width: 100%;
 }

 /* Section backgrounds and layouts */
 .features-reviews-section {
   position: relative;
 }

 /* Trustpilot branding colors */
 .trustpilot-green {
   color: #00b67a;
 }
 
 .trustpilot-bg {
   background-color: #00b67a;
 }

 .trustpilot-star {
   color: #00b67a;
 }


` as const;

export default component$(() => {
 useStylesScoped$(SLIDER_STYLES);

 // 🚀 REMOVED: Unnecessary image preloading that forced hydration
 // Images will load naturally when sections become visible

 // 🚀 REMOVED: Complex navigation handler - Link prefetch is sufficient

 // 🚀 REMOVED: Animation observer that forced hydration and could cause crashes
 // Animations now handled by CSS-only approach for better performance

	return (
		<div class="vertical-scroll-container">
			{/* Section 1: Hero Section */}
			<section class="page-section hero-section relative overflow-hidden">
				{/* Hero Background Image */}
				<div class="absolute inset-0">
					<picture>
						<source
							type="image/avif"
							srcset={`${HeroImage_480} 480w,${HeroImage_768} 768w,${HeroImage_1024} 1024w,${HeroImage_1600} 1600w,${HeroImage_2000} 2000w`}
							sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
						/>
						<source
							type="image/webp"
							srcset={`${HeroImageWebP_480} 480w,${HeroImageWebP_768} 768w,${HeroImageWebP_1024} 1024w,${HeroImageWebP_1600} 1600w,${HeroImageWebP_2000} 2000w`}
							sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
						/>
						<source
							type="image/jpeg"
							srcset={`${HeroImageJPEG_480} 480w,${HeroImageJPEG_768} 768w,${HeroImageJPEG_1024} 1024w,${HeroImageJPEG_1600} 1600w,${HeroImageJPEG_2000} 2000w`}
							sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
						/>
						<img
							src={HeroImageJPEG_1024}
							alt="Premium Knife from Rotten Hand"
							loading="eager"
							fetchPriority="high"
							width={1024}
							height={683}
							style={{ width: '100%', height: '100%', objectFit: 'cover' }}
						/>
					</picture>
					{/* Dark overlay for text readability */}
					<div class="absolute inset-0 hero-overlay"></div>
				</div>

				{/* Hero Content - Mobile: bottom with extra padding for URL bar, Desktop: bottom-left text, bottom-right button */}
				<div class="relative z-10 h-full flex flex-col items-center justify-end lg:flex-row lg:items-end lg:justify-between px-6 sm:px-8 lg:px-16 xl:px-20 pb-28 sm:pb-32 lg:pb-16">
						{/* Text Content - Mobile: centered, Desktop: bottom left */}
						<div class="text-center lg:text-left max-w-2xl mb-8 lg:mb-0">
							{/* Main Hero Title - Large, Bold, White */}
							<h1 class="font-heading tracking-wider text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-none mb-4 lg:mb-6">
								PRECISION CRAFTED TOOLS,
							</h1>

							{/* Hero Subtitle */}
							<p class="font-body text-sm sm:text-base lg:text-lg xl:text-xl text-white lg:text-[#e34545] font-bold tracking-wider">
								FOR THE DISCERNING COLLECTOR.
							</p>
						</div>

						{/* CTA Button - Mobile: centered below text, Desktop: bottom right */}
						<Link
							href="/shop"
							prefetch
							class="bg-[#e34545] hover:bg-[#d32f2f] text-white px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base lg:text-lg font-bold tracking-wide transition-all duration-300 hover:shadow-xl uppercase whitespace-nowrap rounded-full cursor-pointer inline-block text-center"
						>
							SHOP NOW →
						</Link>
					</div>
				</section>

				{/* Section 2: Features & Reviews */}
				<section class="page-section features-reviews-section justify-center">
					{/* Background Image */}
					<div class="absolute inset-0">
						<picture>
							<source
								type="image/avif"
								srcset={`${Section2Image_480} 480w,${Section2Image_768} 768w,${Section2Image_1024} 1024w,${Section2Image_1600} 1600w,${Section2Image_2000} 2000w`}
								sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
							/>
							<source
								type="image/webp"
								srcset={`${Section2ImageWebP_480} 480w,${Section2ImageWebP_768} 768w,${Section2ImageWebP_1024} 1024w,${Section2ImageWebP_1600} 1600w,${Section2ImageWebP_2000} 2000w`}
								sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
							/>
							<source
								type="image/jpeg"
								srcset={`${Section2ImageJPEG_480} 480w,${Section2ImageJPEG_768} 768w,${Section2ImageJPEG_1024} 1024w,${Section2ImageJPEG_1600} 1600w,${Section2ImageJPEG_2000} 2000w`}
								sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
							/>
							<img
								src={Section2ImageJPEG_1024}
								alt="Rotten Hand Background"
								loading="lazy"
								width={1024}
								height={683}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						</picture>
						{/* Header gradient overlay only */}
						<div class="absolute inset-0 hero-overlay"></div>
					</div>

					<div class="relative z-10 w-full flex items-center">
						<div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-16 w-full">
							{/* Mobile: Stack vertically with better spacing, Desktop: Keep 2-column grid */}
							<div class="flex flex-col space-y-4 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center lg:space-y-0 h-full py-4 lg:py-8"> 
								
								{/* Mobile: Features first for better mobile UX, Desktop: Trustpilot Reviews (left side) */}
								<div class="order-2 lg:order-1">
									<LazyReviewsSection />
								</div>

								{/* Mobile: Features first for mobile UX, Desktop: Features (right side) */}
								<div class="order-1 lg:order-2">
									<LazyFeaturesSection />
								</div>

							</div>
						</div>
					</div>
				</section>

				{/* Section 3: Brand Story with Integrated Footer */}
				<section class="page-section relative overflow-hidden">
					{/* Background Image */}
					<div class="absolute inset-0">
						<picture>
							<source
								type="image/avif"
								srcset={`${HomeLast_480} 480w,${HomeLast_768} 768w,${HomeLast_1024} 1024w,${HomeLast_1600} 1600w,${HomeLast_2000} 2000w`}
								sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
							/>
							<source
								type="image/webp"
								srcset={`${HomeLastWebP_480} 480w,${HomeLastWebP_768} 768w,${HomeLastWebP_1024} 1024w,${HomeLastWebP_1600} 1600w,${HomeLastWebP_2000} 2000w`}
								sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
							/>
							<source
								type="image/jpeg"
								srcset={`${HomeLastJPEG_480} 480w,${HomeLastJPEG_768} 768w,${HomeLastJPEG_1024} 1024w,${HomeLastJPEG_1600} 1600w,${HomeLastJPEG_2000} 2000w`}
								sizes="(max-width: 600px) 100vw, (max-width: 1200px) 80vw, 60vw"
							/>
							<img
								src={HomeLastJPEG_1024}
								alt="Rotten Hand Background"
								loading="lazy"
								width={1024}
								height={683}
								style={{ width: '100%', height: '100%', objectFit: 'cover' }}
							/>
						</picture>
						{/* Light overlay to darken image slightly for text readability */}
						<div class="absolute inset-0 bg-black/20"></div>
					</div>

					{/* Content - Simplified structure with consistent spacing */}
					<div class="relative z-10 h-full flex flex-col justify-center px-6 sm:px-8 lg:px-16 xl:px-20 py-16">
						<div class="mx-auto w-full h-full flex flex-col justify-center max-w-7xl gap-8">
							<LazyBrandStorySection />
						</div>
					</div>
				</section>
		</div>
	);
});

export const head = () => {
	return createSEOHead({
		title: 'Rotten Hand - Precision Crafted Knives',
		description: 'Premium handcrafted knives and tools. Shop our unique collection of custom blades, EDC gear, and more.',
		noindex: false,
		links: [
			// Preload critical hero images for optimal LCP
			// Mobile-first: 768w for most mobile devices
			{
				rel: 'preload',
				as: 'image',
				href: HeroImage_768,
				type: 'image/avif',
				media: '(max-width: 1023px)',
			},
			{
				rel: 'preload',
				as: 'image',
				href: HeroImageWebP_768,
				type: 'image/webp',
				media: '(max-width: 1023px)',
			},
			// Desktop: 1600w for larger screens
			{
				rel: 'preload',
				as: 'image',
				href: HeroImage_1600,
				type: 'image/avif',
				media: '(min-width: 1024px)',
			},
			{
				rel: 'preload',
				as: 'image',
				href: HeroImageWebP_1600,
				type: 'image/webp',
				media: '(min-width: 1024px)',
			},
		],
	});
};