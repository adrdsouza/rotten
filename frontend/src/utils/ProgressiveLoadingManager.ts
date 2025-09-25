/**
 * Progressive Loading Manager
 * Handles intelligent loading of shop components based on user intent and viewport proximity
 */

export interface LoadingPriority {
  immediate: string[];
  high: string[];
  medium: string[];
  low: string[];
}

export interface UserIntentSignals {
  scrollDirection: 'up' | 'down' | 'none';
  scrollVelocity: number;
  timeOnPage: number;
  mouseMovement: boolean;
  touchInteraction: boolean;
  proximityToShop: number; // Distance in pixels to shop section
}

export class ProgressiveLoadingManager {
  private static instance: ProgressiveLoadingManager;
  private loadingQueue: Map<string, () => Promise<void>> = new Map();
  private loadedComponents: Set<string> = new Set();
  private userIntentSignals: UserIntentSignals = {
    scrollDirection: 'none',
    scrollVelocity: 0,
    timeOnPage: 0,
    mouseMovement: false,
    touchInteraction: false,
    proximityToShop: Infinity
  };
  private observers: Map<string, IntersectionObserver> = new Map();
  private startTime: number = Date.now();
  private lastScrollY: number = 0;
  private scrollVelocityHistory: number[] = [];

  private constructor() {
    this.initializeUserIntentTracking();
  }

  static getInstance(): ProgressiveLoadingManager {
    if (!ProgressiveLoadingManager.instance) {
      ProgressiveLoadingManager.instance = new ProgressiveLoadingManager();
    }
    return ProgressiveLoadingManager.instance;
  }

  /**
   * Register a component for progressive loading
   */
  registerComponent(
    componentId: string,
    loadFunction: () => Promise<void>,
    priority: 'immediate' | 'high' | 'medium' | 'low' = 'medium'
  ): void {
    this.loadingQueue.set(componentId, loadFunction);

    // Load immediately if high priority or user shows intent
    if (priority === 'immediate' || this.shouldLoadImmediately(componentId)) {
      this.loadComponent(componentId);
    }
  }

  /**
   * Load a specific component
   */
  async loadComponent(componentId: string): Promise<void> {
    if (this.loadedComponents.has(componentId)) {
      return; // Already loaded
    }

    const loadFunction = this.loadingQueue.get(componentId);
    if (!loadFunction) {
      console.warn(`Component ${componentId} not registered for loading`);
      return;
    }

    try {
      console.log(`🔄 Progressive loading: ${componentId}`);
      await loadFunction();
      this.loadedComponents.add(componentId);
      console.log(`✅ Progressive loading complete: ${componentId}`);
    } catch (error) {
      console.error(`❌ Progressive loading failed: ${componentId}`, error);
    }
  }

  /**
   * Check if component should load immediately based on user intent
   */
  private shouldLoadImmediately(componentId: string): boolean {
    const signals = this.userIntentSignals;

    // Load if user is scrolling towards shop section
    if (componentId.includes('shop') && signals.scrollDirection === 'down' && signals.scrollVelocity > 50) {
      return true;
    }

    // Load if user has been on page for a while and showing engagement
    if (signals.timeOnPage > 3000 && (signals.mouseMovement || signals.touchInteraction)) {
      return true;
    }

    // Load if user is close to shop section
    if (signals.proximityToShop < 800) {
      return true;
    }

    return false;
  }

  /**
   * Set up viewport-based loading for a specific element
   */
  setupViewportLoading(
    elementId: string,
    componentId: string,
    options: IntersectionObserverInit = {}
  ): void {
    const defaultOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '200px 0px', // Start loading 200px before element comes into view
      threshold: 0.1,
      ...options
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadComponent(componentId);
          // Update proximity signal
          this.userIntentSignals.proximityToShop = 0;
        } else {
          // Calculate distance to element
          const rect = entry.boundingClientRect;
          const distance = rect.top > 0 ? rect.top : Math.abs(rect.bottom);
          this.userIntentSignals.proximityToShop = Math.min(
            this.userIntentSignals.proximityToShop,
            distance
          );
        }
      });
    }, defaultOptions);

    // Observe the element when it's available
    const checkElement = () => {
      const element = document.getElementById(elementId);
      if (element) {
        observer.observe(element);
        this.observers.set(elementId, observer);
      } else {
        // Retry after a short delay
        setTimeout(checkElement, 100);
      }
    };

    checkElement();
  }

  /**
   * Initialize user intent tracking
   */
  private initializeUserIntentTracking(): void {
    // Track scroll behavior
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      const currentScrollY = window.scrollY;
      const velocity = Math.abs(currentScrollY - this.lastScrollY);
      
      this.userIntentSignals.scrollDirection = currentScrollY > this.lastScrollY ? 'down' : 'up';
      this.userIntentSignals.scrollVelocity = velocity;
      
      // Keep velocity history for smoothing
      this.scrollVelocityHistory.push(velocity);
      if (this.scrollVelocityHistory.length > 5) {
        this.scrollVelocityHistory.shift();
      }
      
      // Calculate average velocity
      const avgVelocity = this.scrollVelocityHistory.reduce((a, b) => a + b, 0) / this.scrollVelocityHistory.length;
      this.userIntentSignals.scrollVelocity = avgVelocity;
      
      this.lastScrollY = currentScrollY;

      // Reset scroll direction after inactivity
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.userIntentSignals.scrollDirection = 'none';
        this.userIntentSignals.scrollVelocity = 0;
      }, 150);
    }, { passive: true });

    // Track mouse movement
    let mouseTimeout: NodeJS.Timeout;
    window.addEventListener('mousemove', () => {
      this.userIntentSignals.mouseMovement = true;
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        this.userIntentSignals.mouseMovement = false;
      }, 2000);
    }, { passive: true });

    // Track touch interaction
    let touchTimeout: NodeJS.Timeout;
    window.addEventListener('touchstart', () => {
      this.userIntentSignals.touchInteraction = true;
      clearTimeout(touchTimeout);
      touchTimeout = setTimeout(() => {
        this.userIntentSignals.touchInteraction = false;
      }, 2000);
    }, { passive: true });

    // Update time on page
    setInterval(() => {
      this.userIntentSignals.timeOnPage = Date.now() - this.startTime;
    }, 1000);
  }

  /**
   * Preload critical shop data based on user behavior
   */
  async preloadCriticalShopData(): Promise<void> {
    const signals = this.userIntentSignals;
    
    // Preload if user shows strong purchase intent
    if (
      signals.timeOnPage > 5000 && 
      signals.scrollDirection === 'down' && 
      signals.scrollVelocity > 30
    ) {
      console.log('🎯 User shows purchase intent - preloading shop data');
      await this.loadComponent('shop-styles-data');
    }
  }

  /**
   * Clean up observers and event listeners
   */
  cleanup(): void {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
    this.loadingQueue.clear();
    this.loadedComponents.clear();
  }

  /**
   * Get current user intent signals (for debugging)
   */
  getUserIntentSignals(): UserIntentSignals {
    return { ...this.userIntentSignals };
  }

  /**
   * Check if component is loaded
   */
  isComponentLoaded(componentId: string): boolean {
    return this.loadedComponents.has(componentId);
  }
}

// Export singleton instance
export const progressiveLoader = ProgressiveLoadingManager.getInstance();
