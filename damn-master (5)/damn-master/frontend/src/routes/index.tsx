// 🚀 MODERN REDESIGN 2025: Clean, performance-focused homepage
// 🚀 BACKUP: Original homepage saved as index-backup.tsx
import { component$, useStylesScoped$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';
import { createSEOHead } from '~/utils/seo';
import { useLazySection } from '~/hooks/useLazySection';
import { generateOrganizationSchema, generateLocalBusinessSchema, generateWebsiteSchema } from '~/services/seo-api.service';
import VerificationButton from '~/components/verification/VerificationButton';
import { TruckIcon, CreditCardIcon, ShieldIcon } from 'lucide-qwik';

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
      height: 100dvh;
    }
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

  // 🚀 OPTIMIZATION: Lazy load below-the-fold sections
  const { sectionRef: featuresRef, isVisible: featuresVisible } = useLazySection();
  const { sectionRef: testimonialsRef, isVisible: testimonialsVisible } = useLazySection();

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
              alt="Premium EDC folding knife with precision craftsmanship - Damned Designs quality knives and everyday carry tools"
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
        <div class="relative z-10 h-full flex flex-col items-center justify-end lg:flex-row lg:items-end lg:justify-between px-6 sm:px-8 lg:px-16 xl:px-20 pb-16 sm:pb-20 lg:pb-16">
          <div class="text-center lg:text-left max-w-xl lg:max-w-2xl mb-8 lg:mb-0">
            <h1 class="font-heading tracking-wider text-3xl sm:text-4xl md:text-4xl lg:text-4xl font-bold text-white leading-tight mb-2 lg:mb-3">
              PRECISION CRAFTED. PURPOSE DRIVEN. PRICED RIGHT.
            </h1>
            <p class="font-body text-base sm:text-lg lg:text-lg text-[#d42838] font-bold tracking-wider mb-6">
              EVERYDAY TOOLS FOR THE DISCERNING USER.
            </p>
            <p class="font-body text-sm sm:text-base lg:text-base text-white leading-relaxed">
              We design products that look good and work better, without breaking the bank. Our obsession lies in finding that perfect balance between form and function – creating tools with timeless aesthetic appeal that perform flawlessly in real-world use.
            </p>
          </div>
          <Link
            href="/shop"
            prefetch
            class="btn-link btn-lg rounded-full whitespace-nowrap hover:shadow-xl"
          >
            SHOP NOW →
          </Link>
        </div>
      </section>

      {/* Features + Brand Story Section - Clean 50/50 split */}
      <section ref={featuresRef} class="bg-[#F5F5F5]">
        <div class="max-w-full">
          <div class="grid lg:grid-cols-2 gap-0 relative">
            {featuresVisible.value ? (
              <>
                {/* Left: Features Section - Single White Section with Divider */}
                <div class="bg-white flex flex-col">
                  {/* Top: SheerID Discount Section */}
                  <div class="bg-white py-8 px-6 sm:px-8 lg:px-12 xl:px-16 text-center flex-1 flex flex-col justify-center">
                    <div class="max-w-md mx-auto">
                      <div class="w-16 h-16 bg-[#d42838]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-[#d42838]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <h2 class="text-xl sm:text-2xl font-bold mb-2 tracking-tight text-gray-900">
                        EXCLUSIVE DISCOUNTS
                      </h2>
                      <p class="text-sm sm:text-base text-gray-700 font-medium mb-3">
                        Up to 20% Off for Verified Heroes
                      </p>
                      <p class="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
                        Military, First Responders, Teachers & More
                      </p>
                      <VerificationButton
                        variant="secondary"
                        size="sm"
                        class="bg-[#d42838] text-white hover:bg-[#c73030] border-[#d42838] font-bold px-4 py-2 text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div class="mx-6 sm:mx-8 lg:mx-12 xl:mx-16 h-px bg-gray-300"></div>

                  {/* Bottom: 3 Benefits */}
                  <div class="bg-white py-8 px-6 sm:px-8 lg:px-12 xl:px-16 flex-1 flex flex-col justify-center">
                    <div class="w-full max-w-2xl mx-auto">
                      <div class="grid grid-cols-3 gap-4 sm:gap-6">

                        {/* Free Shipping */}
                        <div class="text-center group">
                          <div class="mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <TruckIcon class="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                          </div>
                          <h3 class="text-sm sm:text-base font-bold mb-2 text-[#d42838]">FREE SHIPPING</h3>
                          <p class="text-gray-600 text-xs sm:text-sm">Orders over $100</p>
                        </div>

                        {/* Buy Now, Pay Later */}
                        <div class="text-center group">
                          <div class="mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <CreditCardIcon class="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                          </div>
                          <h3 class="text-sm sm:text-base font-bold mb-2 text-[#d42838]">BUY NOW, PAY LATER</h3>
                          <p class="text-gray-600 text-xs sm:text-sm">4 interest-free payments</p>
                        </div>

                        {/* Lifetime Warranty */}
                        <div class="text-center group">
                          <div class="mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <ShieldIcon class="w-8 h-8 sm:w-10 sm:h-10 text-black" />
                          </div>
                          <h3 class="text-sm sm:text-base font-bold mb-2 text-[#d42838]">LIFETIME WARRANTY</h3>
                          <p class="text-gray-600 text-xs sm:text-sm">Craftsmanship guaranteed</p>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider - Only visible on large screens */}
                <div class="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-300 transform -translate-x-1/2"></div>

                {/* Right: Brand Story */}
                <div class="bg-white py-12 px-6 sm:px-8 lg:px-12 xl:px-16 flex flex-col justify-center">
                  <div class="max-w-lg">
                    <h2 class="text-3xl sm:text-4xl font-bold mb-6 leading-tight text-gray-900">
                      OUR <span class="text-[#d42838]">STORY</span>
                    </h2>
                    <div class="text-sm sm:text-base text-gray-700 leading-relaxed mb-8 space-y-4">
                      <p>
                        At Damned Designs, we believe great design and lasting quality shouldn't cost a fortune. We started with a simple mission: make well-designed, well-manufactured products affordable to everyone.
                      </p>
                      <p>
                        From EDC folding knives to premium fidgets, from lanyard beads to kitchen knives, from fixed blade knives to pry bars - we craft a wide range of everyday tools with purpose. Whether you're looking for the best everyday knife or are a fidgeter, we've got you covered. Each product across our diverse range combines thoughtful design with superior materials.
                      </p>
                      <p>
                        Our focus is simple: deliver quality you can trust and design you'll love. From the best quality kitchen knife to precision EDC tools, good products don't need to be expensive – they just need to be right.
                      </p>
                    </div>
                    <div>
                      <Link
                        href="/shop"
                        prefetch
                        class="btn-link btn-md rounded-lg shadow-lg"
                      >
                        VIEW COLLECTION →
                      </Link>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Loading placeholder for features section */
              <div class="grid lg:grid-cols-2 gap-0 animate-pulse">
                <div class="bg-gray-300 py-12 h-48"></div>
                <div class="bg-gray-100 py-12 h-48"></div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trustpilot Section - Cleaned up and compact */}
      <section ref={testimonialsRef} class="py-16 bg-gray-900 text-white">
        <div class="max-w-7xl mx-auto px-6">
          {testimonialsVisible.value ? (
            <>
              <div class="text-center mb-12">
            <div class="flex flex-col sm:flex-row items-center justify-center mb-6">
              <div class="flex items-center mb-2 sm:mb-0">
                <svg class="w-8 h-8 sm:w-10 sm:h-10 trustpilot-green mr-2 sm:mr-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <h2 class="text-2xl sm:text-4xl font-bold text-white">TRUSTED BY <span class="trustpilot-green">COLLECTORS</span></h2>
              </div>
            </div>
            <div class="flex items-center justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} class="w-6 h-6 sm:w-8 sm:h-8 trustpilot-star fill-current mr-1" viewBox="0 0 24 24">
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
            </>
          ) : (
            /* Loading placeholder for testimonials section */
            <div class="animate-pulse">
              <div class="text-center mb-12">
                <div class="h-12 bg-gray-700 rounded w-2/3 mx-auto mb-6"></div>
                <div class="h-8 bg-gray-700 rounded w-1/3 mx-auto mb-4"></div>
                <div class="h-6 bg-gray-700 rounded w-1/4 mx-auto"></div>
              </div>
              <div class="grid md:grid-cols-3 gap-6 mb-12">
                {[...Array(3)].map((_, i) => (
                  <div key={i} class="bg-gray-700 p-6 rounded-lg h-48"></div>
                ))}
              </div>
              <div class="text-center">
                <div class="h-6 bg-gray-700 rounded w-1/3 mx-auto"></div>
              </div>
            </div>
          )}
        </div>
      </section>






    </div>
  );
});

export const head = () => {
  // Note: Qwik head functions must be synchronous
  // Generate organization and website schemas for homepage
  const organizationSchema = generateOrganizationSchema();
  const localBusinessSchema = generateLocalBusinessSchema();
  const websiteSchema = generateWebsiteSchema();

  return createSEOHead({
    title: 'Damned Designs - Precision Crafted. Purpose Driven. Priced Right.',
    description: 'Quality EDC folding knives, fixed blade knives, and everyday tools that prove exceptional craftsmanship doesn\'t require exceptional prices. Buy pocket knives, kitchen knives, lanyard beads, and fidget spinners online.',
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
    schemas: [organizationSchema, localBusinessSchema, websiteSchema], // Add structured data schemas
  });
};