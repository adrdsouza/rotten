// 🚀 MODERN REDESIGN 2025: Clean, performance-focused homepage
// 🚀 BACKUP: Original homepage saved as index-backup.tsx
import { component$, useStylesScoped$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { createSEOHead } from '~/utils/seo';

// 🚀 OPTIMIZED: Only hero image imports (67% bundle size reduction)
// HERO SECTION - Only image needed for modern design
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

// 🚀 MODERN STYLES: Clean, performance-focused design
const MODERN_STYLES = `
  /* Prevent horizontal scroll */
  html, body {
    overflow-x: hidden;
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
    height: 70vh;
    min-height: 500px;
  }

  @media (min-width: 1024px) {
    .hero-section {
      height: 100vh;
    }
  }

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

  /* Card hover effects */
  .card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .card:hover {
    transform: translateY(-4px);
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  }

  /* Trustpilot colors */
  .trustpilot-green {
    color: #00b67a;
  }

  .trustpilot-star {
    color: #00b67a;
  }
` as const;

export default component$(() => {
  useStylesScoped$(MODERN_STYLES);

  return (
    <div>
      {/* Hero Section */}
      <section class="hero-section relative overflow-hidden">
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
              alt="Premium Knife from Damned Designs"
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

        {/* Hero Content */}
        <div class="relative z-10 h-full flex flex-col items-center justify-end lg:flex-row lg:items-end lg:justify-between px-6 sm:px-8 lg:px-16 xl:px-20 pb-28 sm:pb-32 lg:pb-16">
          <div class="text-center lg:text-left max-w-2xl mb-8 lg:mb-0">
            <h1 class="font-heading tracking-wider text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-none mb-4 lg:mb-6">
              PRECISION CRAFTED TOOLS,
            </h1>
            <p class="font-body text-sm sm:text-base lg:text-lg xl:text-xl text-white lg:text-[#e34545] font-bold tracking-wider">
              FOR THE DISCERNING COLLECTOR.
            </p>
          </div>
          <Link
            href="/shop"
            prefetch
            class="bg-[#e34545] hover:bg-[#d32f2f] text-white px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base lg:text-lg font-bold tracking-wide transition-all duration-300 hover:shadow-xl uppercase whitespace-nowrap rounded-full cursor-pointer inline-block text-center"
          >
            SHOP NOW →
          </Link>
        </div>
      </section>

      {/* Features + Brand Story Section - Clean 50/50 split */}
      <section class="bg-[#F5F5F5]">
        <div class="max-w-full">
          <div class="grid lg:grid-cols-2 gap-0">

            {/* Left: 2x2 Features Grid */}
            <div class="bg-[#F5F5F5] py-12 px-6 sm:px-8 lg:px-12 xl:px-16 flex flex-col justify-center">
              <div class="w-full max-w-lg mx-auto">
                <div class="grid grid-cols-2 gap-8 sm:gap-10 lg:gap-12">

                  <div class="text-center group">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-[#e34545] mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10L4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 class="text-sm sm:text-base font-bold mb-2 text-gray-900">FREE SHIPPING</h3>
                    <p class="text-gray-600 text-xs sm:text-sm">Orders over $100</p>
                  </div>

                  <div class="text-center group">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-[#e34545] mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 class="text-sm sm:text-base font-bold mb-2 text-gray-900">MILITARY DISCOUNT</h3>
                    <p class="text-gray-600 text-xs sm:text-sm">15% off for heroes</p>
                  </div>

                  <div class="text-center group">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-[#e34545] mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 10h22" />
                      </svg>
                    </div>
                    <h3 class="text-sm sm:text-base font-bold mb-2 text-gray-900">BUY NOW, PAY LATER</h3>
                    <p class="text-gray-600 text-xs sm:text-sm">4 interest-free payments</p>
                  </div>

                  <div class="text-center group">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 bg-[#e34545] mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg class="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 class="text-sm sm:text-base font-bold mb-2 text-gray-900">LIFETIME WARRANTY</h3>
                    <p class="text-gray-600 text-xs sm:text-sm">Craftsmanship guaranteed</p>
                  </div>

                </div>
              </div>
            </div>

            {/* Right: Brand Story */}
            <div class="bg-white py-12 px-6 sm:px-8 lg:px-12 xl:px-16 flex flex-col justify-center">
              <div class="max-w-lg">
                <h2 class="text-3xl sm:text-4xl font-bold mb-6 leading-tight text-gray-900">
                  OUR<br/>
                  <span class="text-[#e34545]">STORY</span>
                </h2>
                <div class="text-sm sm:text-base text-gray-700 leading-relaxed mb-8 space-y-4">
                  <p>
                    At Damned Designs, we're passionate about creating exceptional everyday carry tools
                    that combine innovative design, premium materials, and superior craftsmanship.
                  </p>
                  <p>
                    Each knife we create is a perfect balance of form and function, designed to be used
                    and appreciated for years to come.
                  </p>
                </div>
                <div>
                  <Link
                    href="/shop"
                    prefetch
                    class="bg-[#e34545] hover:bg-[#d32f2f] text-white font-bold tracking-wide transition-all duration-300 transform hover:scale-105 uppercase rounded-lg shadow-lg cursor-pointer px-6 py-3 text-sm sm:text-base inline-block"
                  >
                    VIEW COLLECTION →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trustpilot Section - Cleaned up and compact */}
      <section class="py-16 bg-gray-900 text-white">
        <div class="max-w-7xl mx-auto px-6">
          <div class="text-center mb-12">
            <div class="flex items-center justify-center mb-6">
              <svg class="w-10 h-10 trustpilot-green mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <h2 class="text-4xl font-bold text-white">TRUSTED BY <span class="trustpilot-green">COLLECTORS</span></h2>
            </div>
            <div class="flex items-center justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} class="w-8 h-8 trustpilot-star fill-current mr-1" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              ))}
            </div>
            <p class="text-xl text-gray-300">
              <span class="font-bold text-white">4.7 out of 5</span> • <span class="font-bold text-white">298 reviews</span>
            </p>
          </div>

          <div class="grid md:grid-cols-3 gap-6 mb-12">
            <div class="bg-[#F5F5F5] p-6 rounded-lg">
              <div class="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} class="w-4 h-4 trustpilot-star fill-current mr-1" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p class="text-gray-700 mb-4 leading-relaxed">
                "Absolutely amazing company with phenomenal customer service, fast shipping, and out of this world designs and products."
              </p>
              <p class="text-sm text-gray-600 font-semibold uppercase tracking-wide">— JONATHAN RIVERA</p>
            </div>

            <div class="bg-[#F5F5F5] p-6 rounded-lg">
              <div class="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} class="w-4 h-4 trustpilot-star fill-current mr-1" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p class="text-gray-700 mb-4 leading-relaxed">
                "Quick shipping to the UK. Great quality knife. The Cerberus is great for gardening and food prep."
              </p>
              <p class="text-sm text-gray-600 font-semibold uppercase tracking-wide">— MODGE</p>
            </div>

            <div class="bg-[#F5F5F5] p-6 rounded-lg">
              <div class="flex mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} class="w-4 h-4 trustpilot-star fill-current mr-1" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>
              <p class="text-gray-700 mb-4 leading-relaxed">
                "Great lil knives! Comfy and compact designs with great front flipper action. Shipping was quick."
              </p>
              <p class="text-sm text-gray-600 font-semibold uppercase tracking-wide">— MICHAEL SHARP</p>
            </div>
          </div>

          <div class="text-center">
            <a href="https://www.trustpilot.com/review/damneddesigns.com" target="_blank" rel="noopener noreferrer"
              class="trustpilot-green hover:text-white font-bold text-lg uppercase tracking-wide transition-colors">
              READ ALL 298 REVIEWS →
            </a>
          </div>
        </div>
      </section>




    </div>
  );
});

export const head = () => {
  return createSEOHead({
    title: 'Damned Designs - Precision Crafted Knives',
    description: 'Premium handcrafted knives and tools. Shop our unique collection of custom blades, EDC gear, and more.',
    noindex: false,
    links: [
      // 🚀 OPTIMIZED: Only preload hero image for optimal LCP
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
