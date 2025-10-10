# Vendure Qwik Starter Performance Analysis

## Overview
Analysis of performance optimizations in the official Vendure Qwik starter repository compared to our current implementation.

## Key Differences Found

### 1. Image Handling Strategy

#### **Vendure Starter Approach:**
- Uses `qwik-image` package for automatic optimization
- Simple, declarative image components
- No complex preloading logic in components
- Relies on browser-native lazy loading

```tsx
// Their ProductCard.tsx
<Image
  layout="constrained"
  objectFit="cover"
  src={productAsset?.preview}
  alt={productName}
  width="300"
  height="300"
/>
```

#### **Our Current Approach:**
- Custom `OptimizedImage` component with complex logic
- Manual cache checking and preloading
- `useVisibleTask$` for image preloading
- Session-based cache tracking

**Issue:** Our complex image handling might be causing the loading delays.

### 2. Component Simplicity

#### **Vendure Starter:**
- Very simple ProductCard component (~20 lines)
- No `useVisibleTask$` for preloading
- Minimal state management
- Relies on Qwik's built-in optimizations

#### **Our Implementation:**
- Complex OptimizedImage with 350+ lines
- Multiple `useVisibleTask$` calls
- Custom cache management
- Manual preloading strategies

**Issue:** Over-engineering might be hurting performance instead of helping.

### 3. Build Configuration

#### **Missing Analysis:**
- Need to examine their `vite.config.ts`
- Check their package.json dependencies
- Look at their build optimizations

### 4. Route-Level Optimizations

#### **Vendure Starter Collections Page:**
- Uses `routeLoader$` for data fetching
- Simple component structure
- No complex image preloading

#### **Our Shop Page:**
- Complex state management
- Manual image preloading in `useVisibleTask$`
- Session cache tracking

## Recommendations for Improvement

### 1. **Simplify Image Handling**
- Consider switching to `qwik-image` package
- Remove complex preloading logic
- Trust browser-native lazy loading
- Eliminate session cache tracking

### 2. **Reduce Component Complexity**
- Simplify OptimizedImage component
- Remove unnecessary `useVisibleTask$` calls
- Focus on declarative approach

### 3. **Trust Qwik's Built-in Optimizations**
- Qwik already handles code splitting and lazy loading
- Browser caching works well without manual intervention
- Over-optimization can hurt performance

### 4. **Package Dependencies Analysis**

Let me check their key dependencies for performance optimizations:

#### **qwik-image Package**
- Automatic image optimization
- Built-in lazy loading
- Responsive image generation
- WebP/AVIF format support
- No manual cache management needed

#### **Build Optimizations**
- Need to examine their Vite configuration
- Check for image optimization plugins
- Look for preloading strategies

### 5. **Performance Testing Approach**

#### **Current Issues:**
- Images show blank for ~500ms on navigation
- Complex cache checking not working effectively
- Manual preloading causing delays instead of helping

#### **Test Plan:**
1. **Baseline Test**: Measure current performance
2. **Simplified Test**: Remove all manual preloading
3. **qwik-image Test**: Switch to qwik-image package
4. **Compare Results**: Measure loading times

## Hypothesis
Our image loading issues might be caused by:
1. **Over-complex image handling** fighting against browser optimizations
2. **Multiple useVisibleTask$ calls** causing unnecessary re-renders
3. **Manual cache management** interfering with browser cache
4. **Complex component logic** slowing down rendering
5. **Fighting against Qwik's built-in optimizations**

## Immediate Action Items

### ✅ **qwik-image Already Installed**
- Found `qwik-image: 0.0.16` in our package.json
- We can immediately test their approach

### 🎯 **Quick Test Plan**
1. **Create simplified ProductCard using qwik-image**
2. **Remove all manual preloading logic from shop page**
3. **Test performance difference**
4. **Compare with current OptimizedImage approach**

### 📊 **Performance Test Steps**
1. **Baseline**: Measure current shop page load times
2. **Simple Test**: Create basic qwik-image ProductCard
3. **A/B Test**: Compare side-by-side
4. **Measure**: Time to first image, time to all images loaded

## Practical Implementation Test

### **Create Simple ProductCard Test**
```tsx
// Test: SimpleProductCard.tsx (using qwik-image like Vendure starter)
import { component$ } from '@qwik.dev/core';
import { Image } from 'qwik-image';

export const SimpleProductCard = component$(({ product }: any) => {
  return (
    <div class="group relative">
      <div class="aspect-square w-full overflow-hidden rounded-lg bg-gray-200">
        <Image
          layout="constrained"
          objectFit="cover"
          src={product.featuredAsset?.preview}
          alt={product.name}
          width="300"
          height="300"
          loading="lazy"
        />
      </div>
      <div class="mt-4">
        <h3 class="text-sm text-gray-700">{product.name}</h3>
        <p class="mt-1 text-lg font-medium text-gray-900">
          {product.variants[0]?.priceWithTax}
        </p>
      </div>
    </div>
  );
});
```

### **Remove Manual Preloading Test**
```tsx
// Test: Remove this from shop page
useVisibleTask$(() => {
  // Remove all this complex preloading logic
  if (state.search?.items) {
    state.search.items.slice(0, 6).forEach(async (item: any) => {
      // This might be causing the delays!
    });
  }
});
```

### **A/B Test Setup**
1. **Page A**: Current OptimizedImage + manual preloading
2. **Page B**: Simple qwik-image + no preloading
3. **Measure**: Time to first paint, time to images visible

## Beyond Images: Page Load Performance Issues

### **Data Fetching Patterns**

#### **Vendure Starter Approach:**
- Uses `routeLoader$` for server-side data fetching
- Data is available immediately on page load
- No client-side loading states for initial data
- Simple, focused data queries

#### **Our Current Approach:**
- Multiple `useVisibleTask$` calls in layout
- Client-side data fetching after page load
- Complex state management in layout
- Loading states and spinners

**Issue:** Our layout has 3 separate `useVisibleTask$` calls that run after page load, causing delays.

### **Layout Complexity Analysis**

#### **Our Layout Issues:**
```tsx
// Problem: Multiple async tasks after page load
useVisibleTask$(async () => {
  const activeOrder = await getActiveOrderQuery(); // API call #1
});

useVisibleTask$(({ track }) => {
  track(() => location.isNavigating);
  state.isLoading = location.isNavigating; // Causes re-renders
});

useVisibleTask$(({ track }) => {
  // DOM manipulation after load
  if (state.showCart || state.showMenu) {
    document.body.classList.add('overflow-hidden');
  }
});
```

#### **Performance Impact:**
1. **Waterfall loading**: Page loads → JS executes → API calls → UI updates
2. **Multiple re-renders**: State changes trigger component updates
3. **Loading spinners**: User sees loading states instead of content

### **Shop Page Data Loading**

#### **Our Current Issues:**
```tsx
// Problem: Loading 1000 products at once
const initialSearch = await searchQueryWithTerm('', '', [], 0, 1000);

// Problem: Complex state management
const state = useStore<{
  showMenu: boolean;
  search: SearchResponse;
  collections: Collection[];
  allPossibleFacetValues: FacetWithValues[];
  // ... many more fields
}>();
```

#### **Performance Impact:**
- **Large data payload**: Loading 1000 products upfront
- **Complex state**: Heavy state object causes re-render issues
- **No pagination**: All products loaded regardless of viewport

## Long-term Improvements
1. **Simplify data fetching**: Use `routeLoader$` instead of `useVisibleTask$`
2. **Reduce layout complexity**: Move API calls to route loaders
3. **Implement pagination**: Don't load 1000 products at once
4. **Simplify state management**: Reduce complex state objects
5. **Trust Qwik optimizations**: Let framework handle loading patterns
6. **Remove unnecessary loading states**: Use SSR data instead

## Immediate Page Load Fixes

### **1. Move API Calls to Route Loaders**
```tsx
// Instead of useVisibleTask$ in layout:
export const useActiveOrderLoader = routeLoader$(async () => {
  return await getActiveOrderQuery();
});

// Use in component:
const activeOrder = useActiveOrderLoader();
```

### **2. Reduce Shop Page Data Load**
```tsx
// Instead of loading 1000 products:
const initialSearch = await searchQueryWithTerm('', '', [], 0, 24); // Only first page

// Add pagination:
export const useShopLoader = routeLoader$(async ({ url }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 24;
  const skip = (page - 1) * limit;

  return await searchQueryWithTerm('', '', [], skip, limit);
});
```

### **3. Simplify Layout State**
```tsx
// Remove complex state from layout:
const state = useStore({
  showCart: false,
  showMenu: false,
  // Remove: customer, activeOrder, collections, etc.
  // These should be in specific components that need them
});
```

### **4. Performance Test Priorities**
1. **Critical**: Remove `useVisibleTask$` API calls from layout
2. **High**: Implement pagination on shop page
3. **Medium**: Simplify image handling with qwik-image
4. **Low**: Optimize individual component state

### **Expected Results**
- **Faster initial page load**: No client-side API calls blocking render
- **Reduced bundle size**: Less complex state management
- **Better Core Web Vitals**: Faster LCP, lower CLS
- **Smoother navigation**: No loading spinners between pages
