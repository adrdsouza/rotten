import { component$, type QRL } from '@qwik.dev/core';
import { OptimizedImage } from '~/components/ui';

interface ImageModalProps {
  src: string;
  index: number;
  assets: any[];
  onClose$: QRL<() => void>;
  onNavigate$: QRL<(direction: 'prev' | 'next') => void>;
  isLoading?: boolean;
}

export default component$<ImageModalProps>(({ 
  src, 
  index, 
  assets, 
  onClose$, 
  onNavigate$,
  isLoading = false 
}) => {
  return (
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs animate-fade-in"
      onClick$={(e) => {
        // Only close if clicking directly on the backdrop
        if (e.target === e.currentTarget) {
          onClose$();
        }
      }}
    >
      <div class="relative w-screen h-screen flex items-center justify-center">
        {/* Close button */}
        <button 
          class="absolute top-4 right-4 text-white hover:text-gray-300 transition-all duration-200 z-10 bg-black/50 hover:bg-black/70 rounded-full p-2 transform hover:scale-110"
          onClick$={(e) => {
            e.stopPropagation();
            onClose$();
          }}
          aria-label="Close modal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Navigation arrows - only show when there are adjacent images */}
        {/* Previous button - only show if not on first image */}
        {assets.length > 1 && index > 0 && (
          <button 
            class="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-all duration-200 z-10 bg-black/50 hover:bg-black/70 rounded-full p-3 hover:scale-110"
            onClick$={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onNavigate$('prev');
            }}
            aria-label="Previous image"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {/* Next button - only show if not on last image */}
        {assets.length > 1 && index < assets.length - 1 && (
          <button 
            class="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-all duration-200 z-10 bg-black/50 hover:bg-black/70 rounded-full p-3 hover:scale-110"
            onClick$={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onNavigate$('next');
            }}
            aria-label="Next image"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        
        {/* Image counter */}
        {assets.length > 1 && (
          <div 
            class="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 px-3 py-1 rounded-full text-sm z-10"
            onClick$={(e) => e.stopPropagation()}
          >
            {index + 1} / {assets.length}
          </div>
        )}
        
        {/* Modal image container */}
        <div 
          class="relative bg-white rounded-lg overflow-hidden shadow-2xl max-w-[90vw] max-h-[90vh] aspect-4/5 animate-scale-in"
          onClick$={(e) => e.stopPropagation()}
        >
          {/* Loading spinner */}
          {isLoading && (
            <div class="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          )}
          
          <OptimizedImage
            src={src}
            class="w-full h-full object-cover transition-opacity duration-300"
            alt={`Enlarged product image ${index + 1} of ${assets.length}`}
            loading="lazy"
            onClick$={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
});
