# Single Landing Page Implementation Plan

## Overview
Convert the current homepage + shop page into a single, high-performance landing page that tells the complete brand story and enables product selection in one seamless experience.

## Performance Strategy 🚀

### Loading Priorities
1. **Hero Section**: Immediate load (LCP < 1s)
2. **Story Section**: Lazy load after hero complete
3. **Product Selection**: Load on user intent (SHOP button click or scroll proximity)
4. **Video Section**: Lazy load when in viewport
5. **GraphQL Data**: Progressive loading based on user interaction

### Qwik Best Practices
- Use `routeLoader$` for minimal initial data only
- Leverage `useVisibleTask$` for progressive loading
- Implement proper cleanup with AbortController
- Use signals for reactive state management
- Minimize initial bundle size

## Page Structure

### 1. Hero Section (Immediate Load)
**Content:**
- "One Shirt. 18 Options. Zero Bullshit."
- "If it's not the softest shirt you've ever felt, we'll pay you back"
- SHOP button with smooth scroll to #product-selection

**Performance:**
- Preloaded hero images (multiple formats: AVIF, WebP, JPEG)
- Critical CSS inline
- Minimal JavaScript

**User Flow:**
- Ready buyers: Click SHOP → Jump to products
- Browsers: Natural scroll to story

### 2. Story Section (Lazy Load)
**Content:**
- "Three Years in the Making"
- Product development story
- Peach skin finish details
- "Experience the Perfect Shirt" CTA → scroll to products

**Performance:**
- Load after hero complete or on scroll
- Lazy load images when section becomes visible
- Progressive enhancement

### 3. Product Selection Section (On-Demand Load)
**Content:**
- Style selection (Short Sleeves $70 / Long Sleeves $80)
- Progressive size/color selector (appears after style chosen)
- Product images and variant selection
- Add to cart functionality

**Performance:**
- Load basic style data in route loader
- Full product data loads on user intent:
  - SHOP button click
  - Scroll within 200px of section
- Reuse existing progressive loading pattern from shop page
- Assets load only after style selection

**User Experience:**
- Same progressive disclosure as current shop page
- Style → Size → Color → Add to Cart
- Loading states for each step

### 4. Sustainability Video Section (Viewport Load)
**Content:**
- "Conscious consumption over mindless waste"
- Background video with overlay
- "Fast fashion dumps 92 million tons..." messaging
- Ethically made in India story

**Performance:**
- Load only when in viewport (Intersection Observer)
- Video with `preload="none"`
- Fallback image for slow connections

### 5. Guarantee Section (Static)
**Content:**
- Reworked money-back guarantee
- Remove misleading elements
- Specific policy details

**Performance:**
- Static content, minimal resources

## Technical Implementation

### Route Loader Strategy
```typescript
export const useHomepageLoader = routeLoader$(async () => {
  return {
    heroData: {
      // Minimal hero content
    },
    basicStyles: await getShirtStylesForSelection(), // Names, prices only
  };
});
```

### Progressive Loading Signals
```typescript
const heroLoaded = useSignal(false);
const storyVisible = useSignal(false);
const productSectionReady = useSignal(false);
const userShowedIntent = useSignal(false);
const videoSectionVisible = useSignal(false);
```

### User Intent Detection
- **SHOP Button Click**: Immediate product data load + scroll
- **Scroll Proximity**: Preload when within 200px of product section
- **Natural Scroll**: Progressive section loading

### GraphQL Loading Strategy
1. **Route Loader**: Basic style info only (getShirtStylesForSelection)
2. **User Intent**: Full product data (getBatchedProductsForShop)
3. **Style Selection**: Variant data and assets (existing pattern)
4. **No Blocking**: All GraphQL after initial render

## File Structure

### Primary Files to Modify
- `frontend/src/routes/index.tsx` - Main implementation
- Keep existing shop page as backup/reference

### Components to Reuse
- Product selection logic from shop page
- Variant selector components
- Cart functionality
- Image optimization components

### New Components Needed
- Smooth scroll utility
- Section lazy loading wrapper
- Video lazy loading component

## Performance Targets

### Core Web Vitals
- **LCP**: < 1.0s (hero section only)
- **FID**: < 100ms (minimal initial JS)
- **CLS**: < 0.1 (proper image sizing)

### Loading Metrics
- **Initial Bundle**: < 50KB
- **Hero Images**: Preloaded, optimized
- **GraphQL**: Zero blocking queries
- **Time to Interactive**: < 2s

## User Experience Flow

### Fast Path (Ready Buyers)
1. Land on hero
2. Click SHOP button
3. Product data loads + smooth scroll to selection
4. Choose style → size → color → add to cart

### Story Path (Need Convincing)
1. Land on hero
2. Scroll to read story
3. Get convinced by brand narrative
4. Reach product selection (data already loaded)
5. Choose style → size → color → add to cart

### Both Paths Converge
- Same product selection experience
- Same cart functionality
- Same checkout flow

## Implementation Steps

### Phase 1: Setup
1. Create backup of current homepage
2. Set up new route loader with minimal data
3. Implement basic page structure

### Phase 2: Hero Section
1. Implement immediate hero loading
2. Add smooth scroll functionality
3. Optimize hero images and critical CSS

### Phase 3: Progressive Loading
1. Add story section lazy loading
2. Implement product section on-demand loading
3. Add video section viewport loading

### Phase 4: Integration
1. Merge product selection from shop page
2. Implement progressive disclosure
3. Connect cart functionality

### Phase 5: Optimization
1. Performance testing and optimization
2. Analytics implementation
3. A/B testing setup

## Success Metrics

### Performance
- LCP improvement: Target < 1s
- Conversion rate increase: Target 20-35%
- Bounce rate reduction: Target 15-25%

### User Behavior
- Time on page increase
- Scroll depth improvement
- Product selection completion rate

### Business Impact
- Higher conversion rates
- Reduced cart abandonment
- Improved mobile experience

## Risk Mitigation

### Fallbacks
- Keep current shop page as backup
- Progressive enhancement approach
- Graceful degradation for slow connections

### Testing Strategy
- Performance testing on various devices
- A/B testing against current flow
- User testing for UX validation

## Next Steps
1. Review and approve plan
2. Begin Phase 1 implementation
3. Set up performance monitoring
4. Create testing strategy
