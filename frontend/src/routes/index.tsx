// 🚀 MODERN REDESIGN 2025: Clean, performance-focused homepage with integrated shop
// 🚀 BACKUP: Original homepage saved as index-backup.tsx
import { component$, useStylesScoped$, $ } from '@qwik.dev/core';
import { createSEOHead } from '~/utils/seo';
import { ShopComponent } from '~/components/shop/ShopComponent';

// Shop image - optimized responsive (mobile + desktop, AVIF + WebP)
import ShopImageAvif_800 from '~/media/shop.jpg?format=avif&width=800&quality=80';
import ShopImageAvif_1200 from '~/media/shop.jpg?format=avif&width=1200&quality=80';
import ShopImageWebp_800 from '~/media/shop.jpg?format=webp&width=800&quality=80';
import ShopImageWebp_1200 from '~/media/shop.jpg?format=webp&width=1200&quality=80';

// 🚀 OPTIMIZED: Hero image imports - AVIF + WebP only, 4 sizes (best practice)
import HeroImage_480 from '~/media/hero.png?format=avif&width=480&quality=85&url';
import HeroImage_768 from '~/media/hero.png?format=avif&width=768&quality=85&url';
import HeroImage_1024 from '~/media/hero.png?format=avif&width=1024&quality=85&url';
import HeroImage_1600 from '~/media/hero.png?format=avif&width=1600&quality=85&url';
import HeroImageWebP_480 from '~/media/hero.png?format=webp&width=480&quality=85&url';
import HeroImageWebP_768 from '~/media/hero.png?format=webp&width=768&quality=85&url';
import HeroImageWebP_1024 from '~/media/hero.png?format=webp&width=1024&quality=85&url';
import HeroImageWebP_1600 from '~/media/hero.png?format=webp&width=1600&quality=85&url';
// Video is now in public folder

// 🚀 MODERN STYLES: Clean, performance-focused design
const MODERN_STYLES = `
  /* Prevent horizontal scroll and Safari iOS viewport fixes */
  html {
    overflow-x: hidden;
    height: -webkit-fill-available;
  }

  body {
    overflow-x: hidden;
    min-height: 100vh;
    min-height: -webkit-fill-available;
  }

  /* Hero image optimization */
  .hero-image {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    backface-visibility: hidden;
    transform: translateZ(0);
  }

  .hero-overlay {
    background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 20%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0) 60%);
  }

  /* Modern section styling */
  .section {
    padding: 4rem 1rem;
  }

  @media (min-width: 768px) {
    .section {
      padding: 6rem 2rem;
    }
  }

  /* Hero section */
  .hero-section {
    height: 100vh;
    width: 100%;
    min-height: 500px;
    /* Safari iOS fix */
    height: calc(var(--vh, 1vh) * 100);
  }

  /* Modern viewport units - svh prevents shifting when Safari URL bar appears/disappears */
  @supports (height: 100svh) {
    .hero-section {
      height: 100svh;
    }
  }

  /* Fallback for browsers that support dvh but not svh */
  @supports (height: 100dvh) and (not (height: 100svh)) {
    .hero-section {
      height: 100dvh;
    }
  }

  /* Safari-specific fixes */
  @supports (-webkit-touch-callout: none) {
    .hero-section {
      height: -webkit-fill-available;
      min-height: -webkit-fill-available;
    }
  }

  /* Mobile-specific fixes */
  @media screen and (max-width: 768px) {
    .hero-section {
      width: 100vw;
      height: var(--actual-height, 100vh);
      min-height: var(--actual-height, 100vh);
    }

    /* Modern viewport units for mobile */
    @supports (height: 100svh) {
      .hero-section {
        height: 100svh;
        min-height: 100svh;
      }
    }

    @supports (width: 100dvw) {
      .hero-section {
        width: 100dvw;
      }
    }
  }

  /* Card hover effects */
  .card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  }


` as const;

// 🚀 REMOVED: Route loader that was blocking initial page load
// Product data now loads on-demand via Intersection Observer or user interaction

export default component$(() => {
  useStylesScoped$(MODERN_STYLES);

  // Reusable scroll to shop function - triggers lazy load
  const scrollToShop = $(() => {
    // Trigger lazy load event before scrolling
    window.dispatchEvent(new CustomEvent('shop-button-click'));

    const shopSection = document.getElementById('shop-section');
    if (shopSection) {
      const headerHeight = 64; // Account for header
      const offset = 20;
      const rect = shopSection.getBoundingClientRect();

      window.scrollTo({
        top: window.scrollY + rect.top - headerHeight - offset,
        behavior: 'smooth'
      });
    }
  });

  return (
    <div>
      {/* Hero Section */}
      <section class="hero-section relative overflow-hidden">
        {/* Hero Background Image - Optimized: AVIF + WebP, 4 sizes */}
        <div class="absolute inset-0">
          <picture>
            <source
              type="image/avif"
              srcset={`${HeroImage_480} 480w, ${HeroImage_768} 768w, ${HeroImage_1024} 1024w, ${HeroImage_1600} 1600w`}
              sizes="100vw"
            />
            <source
              type="image/webp"
              srcset={`${HeroImageWebP_480} 480w, ${HeroImageWebP_768} 768w, ${HeroImageWebP_1024} 1024w, ${HeroImageWebP_1600} 1600w`}
              sizes="100vw"
            />
            <img
              src={HeroImageWebP_1024}
              alt="Premium Knife from Rotten Hand"
              loading="eager"
              fetchPriority="high"
              width={1024}
              height={683}
              class="hero-image"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </picture>
          <div class="absolute inset-0 hero-overlay"></div>
        </div>

        {/* Hero Content - Clean, Premium Design with CSS animations */}
        <div class="relative z-10 h-full flex items-end justify-center px-6 sm:px-8 lg:px-16 pb-16 sm:pb-20 lg:pb-24">
          <div class="text-center max-w-3xl">
            <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white leading-tight mb-6 tracking-tight animate-fade-up">
              One Shirt. 18 Options.<br/>
              <span class="font-normal">Zero Bullshit.</span>
            </h1>
            <p class="font-body text-base sm:text-lg lg:text-xl text-white/90 font-light leading-relaxed mb-8 max-w-xl mx-auto animate-fade-up" style="animation-delay: 0.2s;">
              If it's not the softest shirt you've ever felt, we'll pay you back
            </p>
            <button
              onClick$={scrollToShop}
              class="inline-block bg-[#8a6d4a] text-white px-8 py-2 text-center font-medium tracking-wide transition-all duration-300 hover:bg-[#4F3B26] hover:scale-105 hover:shadow-xl rounded-lg shadow-lg border border-[#8a6d4a] animate-scale cursor-pointer"
              style="animation-delay: 0.4s;"
            >
              <div class="text-4xl font-bold uppercase tracking-widest">SHOP</div>
              <div class="text-xs uppercase tracking-wide mt-1">Our Money Back Guarantee</div>
            </button>
          </div>
        </div>
      </section>

      {/* The Perfect Shirt Story - Half and Half Layout */}
      <section class="py-12 lg:py-20 bg-white">
        <div class="max-w-7xl mx-auto px-8 lg:px-16">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Image with optimized formats (responsive) */}
            <div class="relative">
              <picture>
                <source
                  type="image/avif"
                  srcset={`${ShopImageAvif_800} 800w, ${ShopImageAvif_1200} 1200w`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <source
                  type="image/webp"
                  srcset={`${ShopImageWebp_800} 800w, ${ShopImageWebp_1200} 1200w`}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <img
                  src={ShopImageWebp_800}
                  alt="Premium shirt collection - Three years in the making"
                  class="w-full h-[600px] object-cover rounded-2xl shadow-2xl"
                  width={800}
                  height={600}
                  fetchPriority="low"
                />
              </picture>
              <div class="absolute inset-0 bg-black/20 rounded-2xl"></div>
            </div>

            {/* Right Side - Content */}
            <div class="space-y-8">
              <div>
                <h2 class="text-4xl lg:text-6xl font-light text-black mb-6 tracking-wider">
                  Three Years in the Making
                </h2>
                <p class="text-xl lg:text-2xl font-light text-gray-600 mb-8">
                  The pursuit of the perfect shirt
                </p>
              </div>

              <div class="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  Three years ago, I set out to find the perfect shirt. Not just good, not just comfortable, but absolutely perfect. After eighteen months of relentless research, sampling dozens of fabrics, and countless rounds of testing, I discovered something extraordinary.
                </p>
                <p>
                  The softest fabric you'll ever feel, with a luxurious peach skin finish that transforms the way you experience comfort. This isn't just another shirt—it's the culmination of obsessive attention to detail and an unwavering commitment to excellence.
                </p>
              </div>

              <div class="pt-4">
                <button
                  onClick$={scrollToShop}
                  class="inline-flex items-center px-8 py-4 bg-[#8a6d4a] text-white font-medium rounded-xl hover:bg-[#4F3B26] transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  Experience the Perfect Shirt
                  <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Style Selector Section - Truly Lazy Loaded */}
      <section id="shop-section" class="bg-gray-50">
        <ShopComponent
          context="homepage"
          scrollTarget="customization-section"
        />
      </section>

      {/* Product Features Section */}
      <section class="py-20 lg:py-32 bg-white">
        <div class="max-w-7xl mx-auto px-8 lg:px-16">
          <div class="text-center mb-16">
            <h2 class="text-4xl lg:text-6xl font-light text-black mb-6 tracking-wider">
              Why This Shirt is Different
            </h2>
            <p class="text-xl lg:text-2xl font-light text-gray-600 max-w-3xl mx-auto">
              Every detail matters when you're building something to last decades
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {/* Feature 1: Peach Skin Finish */}
            <div class="text-center">
              <div class="w-20 h-20 bg-[#8a6d4a] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 class="text-2xl font-semibold text-gray-900 mb-4">Peach Skin Finish</h3>
              <p class="text-gray-600 leading-relaxed">
                The softest fabric you'll ever feel. Our signature peach skin finish creates an unmatched tactile experience that gets better with time.
              </p>
            </div>

            {/* Feature 2: Tagua Nut Buttons */}
            <div class="text-center">
              <div class="w-20 h-20 bg-[#8a6d4a] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                </svg>
              </div>
              <h3 class="text-2xl font-semibold text-gray-900 mb-4">Tagua Nut Buttons</h3>
              <p class="text-gray-600 leading-relaxed">
                Natural buttons made from tagua nuts that fall naturally from palm trees. Durable and sustainable, these buttons support the South American communities who harvest this 'vegetable ivory'.
              </p>
            </div>

            {/* Feature 3: Ethical Manufacturing */}
            <div class="text-center">
              <div class="w-20 h-20 bg-[#8a6d4a] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 class="text-2xl font-semibold text-gray-900 mb-4">Fair Wages</h3>
              <p class="text-gray-600 leading-relaxed">
                Made in India with fair wages and ethical working conditions. We believe great products come from treating people right.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Guarantee Section */}
      <section class="py-20 lg:py-32 bg-black/80 relative overflow-hidden">
        <div class="max-w-4xl mx-auto px-8 lg:px-16 text-center relative z-10">
          <h2 class="text-4xl lg:text-6xl font-light text-white mb-8 tracking-wider">
            Our Promise to You
          </h2>
          <div class="bg-white/10 backdrop-blur-sm rounded-2xl p-8 lg:p-12 border border-white/20">
            <div class="text-6xl mb-6">💯</div>
            <h3 class="text-3xl font-semibold text-white mb-6">100% Satisfaction Guarantee</h3>
            <p class="text-xl text-white/90 leading-relaxed mb-8">
              If this isn't the softest, most comfortable shirt you've ever owned, we'll refund your money. No questions asked. No return shipping required.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 text-white/80">
              <div>
                <div class="text-2xl font-bold mb-2">30 Days</div>
                <div class="text-sm">To try it risk-free</div>
              </div>
              <div>
                <div class="text-2xl font-bold mb-2">Free Returns</div>
                <div class="text-sm">We pay return shipping</div>
              </div>
              <div>
                <div class="text-2xl font-bold mb-2">Full Refund</div>
                <div class="text-sm">Every penny back</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Conscious Consumption Video Section - Moved to End */}
      <section class="relative min-h-screen bg-black overflow-hidden">
        {/* Background Video - Truly lazy loaded to prevent blocking page load */}
        <div class="absolute inset-0">
          <video
            muted
            loop
            playsInline
            class="w-full h-full object-cover"
            preload="none"
            onLoadedData$={() => {
              // Auto-play only after video is loaded and user has scrolled to it
              const video = event?.target as HTMLVideoElement;
              if (video) {
                video.play().catch(() => {
                  // Ignore autoplay failures (browser policy)
                });
              }
            }}
          >
            <source src="/homepage.mp4" type="video/mp4" />
          </video>
          {/* Video overlay for better text readability */}
          <div class="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Content - Positioned on the left with CSS animations */}
        <div class="relative z-10 h-full flex items-center">
          <div class="w-full px-8 lg:px-16 py-20">
            <div class="max-w-2xl">
              <h2 class="text-4xl lg:text-6xl font-light mb-8 leading-tight text-white animate-fade-left">
                Conscious consumption<br/>
                <span class="font-normal text-[#8a6d4a]">over mindless waste.</span>
              </h2>
              <div class="text-xl text-gray-200 leading-relaxed mb-12 space-y-6 animate-fade-left" style="animation-delay: 0.2s;">
                <p>
                  Fast fashion dumps 92 million tons into landfills every year. Why shop trends that end up as waste?
                </p>
                <p>
                  We not only make cool shit for cool people but we make to last. Ethically made in India with fair wages, no exploitation, and materials chosen for longevity, not disposability.
                </p>
              </div>
              <div>
                <button
                  onClick$={scrollToShop}
                  class="inline-block bg-[#8a6d4a] text-black px-8 py-2 text-center font-medium tracking-wide transition-all duration-300 hover:bg-[#4F3B26] hover:text-white hover:scale-105 rounded-lg shadow-lg border border-[#8a6d4a] cursor-pointer"
                >
                  <div class="text-4xl font-bold uppercase tracking-widest">SHOP</div>
                  <div class="text-xs uppercase tracking-wide mt-1">consciously</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>








    </div>
  );
});

export const head = () => {
  return createSEOHead({
    title: 'Rotten Hand - Conscious Fashion, Two Perfect Shirts',
    description: 'Two shirts. Zero compromise. Ethically made in India with fair wages. Built to last decades, not seasons. Why buy garbage when you can buy forever?',
    noindex: false,
    links: [
      // 🚀 OPTIMIZED: Strategic preloads for optimal LCP (AVIF + WebP only)
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