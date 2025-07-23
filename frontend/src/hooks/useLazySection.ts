import { useSignal, useVisibleTask$ } from '@qwik.dev/core';

/**
 * Intersection Observer Hook for Lazy Loading (Optimization 3)
 * Returns a ref to attach to an element and a signal indicating if it's visible
 */
export const useLazySection = () => {
  const sectionRef = useSignal<Element>();
  const isVisible = useSignal(false);
  
  useVisibleTask$(({ cleanup }) => {
    if (!sectionRef.value) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible.value) {
          isVisible.value = true;
          // Disconnect after first intersection to save resources
          observer.disconnect();
        }
      },
      { 
        rootMargin: '100px', // Load 100px before entering viewport
        threshold: 0.1 // Trigger when 10% is visible
      }
    );
    
    observer.observe(sectionRef.value);
    cleanup(() => observer.disconnect());
  });
  
  return { sectionRef, isVisible };
};

/**
 * Smart viewport-based loading for components
 */
export const useViewportLoading = (options: { rootMargin?: string; threshold?: number } = {}) => {
  const elementRef = useSignal<Element>();
  const shouldLoad = useSignal(false);
  const hasLoaded = useSignal(false);
  
  useVisibleTask$(({ cleanup }) => {
    if (!elementRef.value) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded.value) {
          shouldLoad.value = true;
          hasLoaded.value = true;
          observer.disconnect(); // Only load once
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1
      }
    );
    
    observer.observe(elementRef.value);
    cleanup(() => observer.disconnect());
  });
  
  return { elementRef, shouldLoad, hasLoaded };
};
