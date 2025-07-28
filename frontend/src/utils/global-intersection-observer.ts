/**
 * Global Intersection Observer Pattern
 * 
 * Consolidates multiple intersection observers into a single, more efficient global observer.
 * This reduces memory usage and improves performance by avoiding multiple observer instances.
 * 
 * Based on Damned Designs optimization roadmap pattern.
 */

export type IntersectionCallback = () => void;

export interface ObserverOptions {
  rootMargin?: string;
  threshold?: number;
  once?: boolean; // Whether to disconnect after first intersection
}

class GlobalIntersectionObserver {
  private static instance: GlobalIntersectionObserver;
  private observer: IntersectionObserver;
  private callbacks = new Map<Element, IntersectionCallback>();
  private options = new Map<Element, ObserverOptions>();

  private constructor() {
    // Create observer with sensible defaults that work for most use cases
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const callback = this.callbacks.get(entry.target);
            const elementOptions = this.options.get(entry.target);
            
            if (callback) {
              callback();
              
              // If this is a "once" observer, clean up after triggering
              if (elementOptions?.once !== false) {
                this.unobserve(entry.target);
              }
            }
          }
        });
      },
      {
        rootMargin: '100px', // Default: Load 100px before entering viewport
        threshold: 0.1, // Default: Trigger when 10% is visible
      }
    );
  }

  static getInstance(): GlobalIntersectionObserver {
    if (!this.instance) {
      this.instance = new GlobalIntersectionObserver();
    }
    return this.instance;
  }

  observe(element: Element, callback: IntersectionCallback, options: ObserverOptions = {}): void {
    this.callbacks.set(element, callback);
    this.options.set(element, { once: true, ...options }); // Default to "once" behavior
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    this.callbacks.delete(element);
    this.options.delete(element);
    this.observer.unobserve(element);
  }

  disconnect(): void {
    this.callbacks.clear();
    this.options.clear();
    this.observer.disconnect();
  }

  // Get current number of observed elements (useful for debugging)
  getObservedCount(): number {
    return this.callbacks.size;
  }
}

/**
 * Simplified hook that uses the global intersection observer
 * Replaces the individual observer hooks with a more efficient pattern
 */
export const useGlobalIntersectionObserver = () => {
  return GlobalIntersectionObserver.getInstance();
};

/**
 * Debug utility to check how many elements are being observed
 * Useful for monitoring performance improvements
 */
export const getGlobalObserverStats = () => {
  const instance = GlobalIntersectionObserver.getInstance();
  return {
    observedElements: instance.getObservedCount(),
    message: `Global observer is tracking ${instance.getObservedCount()} elements`
  };
};

// Export the singleton instance for direct use if needed
export const globalIntersectionObserver = GlobalIntersectionObserver.getInstance();

// Development helper to log observer stats
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).getObserverStats = getGlobalObserverStats;
  console.log('🔍 Global Intersection Observer initialized. Use getObserverStats() in console to check stats.');
}

// 🚀 MEMORY MANAGEMENT: Cleanup only on page unload (not on visibility change)
if (typeof window !== 'undefined') {
  const cleanup = () => {
    const instance = GlobalIntersectionObserver.getInstance();
    const observedCount = instance.getObservedCount();
    if (observedCount > 0) {
      console.log(`🧹 Cleaning up ${observedCount} intersection observers on page unload`);
      instance.disconnect();
    }
  };

  // Only clean up on actual page unload, not on visibility changes
  window.addEventListener('beforeunload', cleanup);
}
