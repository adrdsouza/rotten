import { useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { globalIntersectionObserver } from '~/utils/global-intersection-observer';

/**
 * 🚀 OPTIMIZED: Intersection Observer Hook using Global Observer Pattern
 * Uses a single global observer instead of creating individual observers
 * Returns a ref to attach to an element and a signal indicating if it's visible
 */
export const useLazySection = () => {
  const sectionRef = useSignal<Element>();
  const isVisible = useSignal(false);

  useVisibleTask$(({ cleanup }) => {
    if (!sectionRef.value) return;

    globalIntersectionObserver.observe(
      sectionRef.value,
      () => {
        isVisible.value = true;
      },
      {
        rootMargin: '100px', // Load 100px before entering viewport
        threshold: 0.1, // Trigger when 10% is visible
        once: true // Disconnect after first intersection to save resources
      }
    );

    cleanup(() => {
      if (sectionRef.value) {
        globalIntersectionObserver.unobserve(sectionRef.value);
      }
    });
  });

  return { sectionRef, isVisible };
};

/**
 * 🚀 OPTIMIZED: Smart viewport-based loading using Global Observer Pattern
 * Uses the global observer for better performance and memory usage
 */
export const useViewportLoading = (options: { rootMargin?: string; threshold?: number } = {}) => {
  const elementRef = useSignal<Element>();
  const shouldLoad = useSignal(false);
  const hasLoaded = useSignal(false);

  useVisibleTask$(({ cleanup }) => {
    if (!elementRef.value) return;

    globalIntersectionObserver.observe(
      elementRef.value,
      () => {
        if (!hasLoaded.value) {
          shouldLoad.value = true;
          hasLoaded.value = true;
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
        once: true // Only load once
      }
    );

    cleanup(() => {
      if (elementRef.value) {
        globalIntersectionObserver.unobserve(elementRef.value);
      }
    });
  });

  return { elementRef, shouldLoad, hasLoaded };
};
