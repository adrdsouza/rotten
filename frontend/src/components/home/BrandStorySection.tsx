import { component$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';

/**
 * Brand Story and Footer section component - extracted for lazy loading
 * Contains the "Our Story" content and integrated footer with social media and navigation
 */
export const BrandStorySection = component$(() => {

  return (
    <>
      {/* Main Brand Story Content */}
      <div class="bg-black/25 backdrop-blur-sm rounded-lg border border-white/15 text-center flex-1 flex flex-col justify-center p-8 lg:p-12">
        <h2 class="font-heading font-black text-white tracking-tight text-3xl lg:text-5xl mb-6">
          OUR STORY
        </h2>
        <div class="text-gray-100 leading-relaxed mx-auto text-lg lg:text-xl max-w-4xl mb-8">
          <p class="mb-4">
            At Rotten Hand, we're passionate about creating exceptional everyday carry tools
            that combine innovative design, premium materials, and superior craftsmanship.
          </p>
          <p>
            Each knife we create is a perfect balance of form and function, designed to be used
            and appreciated for years to come. We take pride in our attention to detail, our
            innovative approach to design, and our unwavering commitment to quality.
          </p>
        </div>
        
        {/* Call to Action */}
        <div>
          <Link
            href="/shop"
            prefetch
            class="bg-[#ddd7c0] hover:bg-[#4F3B26] text-white font-bold tracking-wide transition-all duration-300 transform hover:scale-105 uppercase rounded-lg shadow-lg cursor-pointer px-8 py-4 text-lg inline-block text-center"
          >
            VIEW COLLECTION →
          </Link>
        </div>
      </div>

      {/* Integrated Footer Content - Always visible, consistent styling */}
      <div class="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 flex-1 flex flex-col justify-center p-6 lg:p-8">
        {/* Main Footer Content */}
        <div class="flex flex-col lg:flex-row lg:justify-between lg:items-start lg:space-y-0 gap-6 lg:gap-8 mb-6">
          
          {/* Brand Section */}
          <div class="text-center lg:text-left">
            <div class="flex items-center justify-center lg:justify-start mb-4">
              <span class="font-bold text-white brand-text text-xl">Rotten Hand</span>
            </div>
            {/* Social Media Section */}
            <div class="mb-3">
              <p class="font-medium text-gray-300 text-sm mb-3">Follow us on social media</p>
              <div class="flex justify-center lg:justify-start space-x-4">
                <a href="https://www.facebook.com/rottenhand" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors group" aria-label="Follow us on Facebook">
                  <svg class="group-hover:scale-110 transition-transform duration-200 w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.04C6.48 2.04 2 6.52 2 12.06c0 4.98 3.66 9.14 8.44 9.9v-7H7.88V12.1h2.56V9.78c0-2.54 1.53-3.94 3.82-3.94 1.1 0 2.24.2 2.24.2v2.5H15.2c-1.24 0-1.64.78-1.64 1.58v1.88h2.78l-.44 2.88h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94C22 6.52 17.52 2.04 12 2.04z" />
                  </svg>
                </a>
                <a href="https://www.pinterest.com/rottenhand/" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors group" aria-label="Follow us on Pinterest">
                  <svg class="group-hover:scale-110 transition-transform duration-200 w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.098.119.112.223.083.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.878-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.748-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z" />
                  </svg>
                </a>
                <a href="https://www.instagram.com/rottenhand/" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-white transition-colors group" aria-label="Follow us on Instagram">
                  <svg class="group-hover:scale-110 transition-transform duration-200 w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:flex lg:flex-row lg:justify-end lg:space-x-12 text-center sm:text-left">
            
            {/* Company Links */}
            <div class="mb-4">
              <h3 class="font-semibold text-white uppercase tracking-wide text-sm mb-4">Company</h3>
              <div class="flex flex-col text-sm gap-3">
                <Link href="/contact" class="text-gray-300 hover:text-white transition-colors">Contact & About</Link>
              </div>
            </div>

            {/* Customer Service Links */}
            <div class="mb-4">
              <h3 class="font-semibold text-white uppercase tracking-wide text-sm mb-4">Customer Service</h3>
              <div class="flex flex-col gap-3">
                <Link href="/contact" class="text-gray-300 hover:text-white transition-colors text-sm">Contact & About</Link>
                <Link href="/privacy" class="text-gray-300 hover:text-white transition-colors text-sm">Privacy Policy</Link>
                <Link href="/terms" class="text-gray-300 hover:text-white transition-colors text-sm">Terms of Service</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div class="border-t border-white border-opacity-20 pt-4">
          <div class="text-center">
            <p class="text-gray-400 text-xs">© 2025 Rotten Hand. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
});

// 🚀 LAZY LOADING: Default export for lazy$() import
export default BrandStorySection;
