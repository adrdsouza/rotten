# Trigger Pattern Anti-Pattern Refactor - Proposal

## Date: 2025-10-09

---

## 🎯 Problem Statement

The ShopComponent currently uses **8+ `useVisibleTask$` watchers** with trigger signals to handle component communication. This is an anti-pattern in Qwik that:

1. **Violates Qwik Best Practices**: `useVisibleTask$` should only be used for viewport-dependent operations (analytics, lazy loading below fold)
2. **Adds Unnecessary Complexity**: Indirect event flow through signals instead of direct handler calls
3. **Impacts Performance**: Multiple watchers running on every signal change
4. **Reduces Maintainability**: Harder to trace event flow from child to parent
5. **Breaks Resumability**: Not optimal for Qwik's resumability model

---

## 📚 Qwik Best Practices (from Official Docs)

### ✅ Correct Pattern: Direct Event Handlers

From Qwik documentation, the recommended approach is:

```typescript
// Parent Component
export const Parent = component$(() => {
  const handleEvent = $(async (value: string) => {
    console.log('Event received:', value);
  });

  return <Child onEvent$={handleEvent} />;
});

// Child Component
interface ChildProps {
  onEvent$: QRL<(value: string) => void>;
}

export const Child = component$<ChildProps>(({ onEvent$ }) => {
  return (
    <button onClick$={() => onEvent$('clicked')}>
      Click me
    </button>
  );
});
```

### ❌ Anti-Pattern: Trigger Signals with useVisibleTask$

```typescript
// Parent Component (WRONG)
const trigger = useSignal<string | null>(null);

useVisibleTask$(({ track }) => {
  track(() => trigger.value);
  if (trigger.value) {
    handleEvent(trigger.value);
    trigger.value = null;
  }
});

return <Child trigger={trigger} />;

// Child Component (WRONG)
onClick$={() => {
  props.trigger.value = 'clicked';
}}
```

**Why this is wrong:**
- `useVisibleTask$` eagerly downloads and executes JavaScript
- Creates unnecessary watchers that run on every signal change
- Indirect event flow is harder to debug and maintain
- Not following Qwik's component communication model

---

## 🔧 Proposed Solution

### Step 1: Replace All Trigger Signals with QRL Event Handlers

| Current Trigger Signal | New Event Handler Prop | Handler Function | Components Affected |
|------------------------|------------------------|------------------|---------------------|
| `styleSelectTrigger` | `onStyleSelect$` | `handleStyleSelect` | StyleSelection, StyleSelection-v2 |
| `sizeSelectTrigger` | `onSizeSelect$` | `handleSizeSelect` | SizeColorSelection, SizeColorSelection-v2 |
| `colorSelectTrigger` | `onColorSelect$` | `handleColorSelect` | SizeColorSelection, SizeColorSelection-v2 |
| `prevStepTrigger` | `onPrevStep$` | `prevStep` | SizeColorSelection, SizeColorSelection-v2 |
| `toggleSizeChartTrigger` | `onToggleSizeChart$` | `toggleSizeChart` | SizeColorSelection, SizeColorSelection-v2 |
| `imageSelectTrigger` | `onImageSelect$` | `handleImageSelect` | SizeColorSelection, SizeColorSelection-v2 |
| `touchStartTrigger` | `onTouchStart$` | `handleTouchStart` | SizeColorSelection, SizeColorSelection-v2 |
| `touchMoveTrigger` | `onTouchMove$` | `handleTouchMove` | SizeColorSelection, SizeColorSelection-v2 |
| `touchEndTrigger` | `onTouchEnd$` | `handleTouchEnd` | SizeColorSelection, SizeColorSelection-v2 |
| `addToCartTrigger` | `onAddToCart$` | `handleAddToCart` | AddToCartFlow, AddToCartFlow-v2 |

### Step 2: Update ShopComponent.tsx (Parent)

**Remove:**
```typescript
// ❌ Remove all trigger signals
const styleSelectTrigger = useSignal<'short' | 'long' | null>(null);
const sizeSelectTrigger = useSignal<string | null>(null);
// ... etc

// ❌ Remove all useVisibleTask$ watchers (lines 397-404)
useVisibleTask$(({ track }) => { track(() => styleSelectTrigger.value); ... });
// ... etc
```

**Add:**
```typescript
// ✅ Keep existing handler functions (already using $())
// These are already defined correctly:
const handleStyleSelect = $(async (style: 'short' | 'long') => { ... });
const handleSizeSelect = $(async (size: string) => { ... });
const handleColorSelect = $(async (color: string) => { ... });
const prevStep = $(() => { ... });

// ✅ Add new simple handlers for UI actions
const toggleSizeChart = $(() => {
  showSizeChart.value = !showSizeChart.value;
});

const handleImageSelect = $((asset: any) => {
  currentProductImage.value = asset;
});

const handleTouchStart = $((touch: { clientX: number; clientY: number }) => {
  touchStartX.value = touch.clientX;
  touchEndX.value = null;
});

const handleTouchMove = $((touch: { clientX: number; clientY: number }) => {
  if (touchStartX.value !== null) {
    touchEndX.value = touch.clientX;
  }
});

const handleTouchEnd = $(() => {
  if (touchStartX.value !== null && touchEndX.value !== null) {
    const diffX = touchStartX.value - touchEndX.value;
    const minSwipeDistance = 50;
    // ... swipe logic (move from useVisibleTask$)
  }
});

const handleAddToCart = $(async () => {
  // ... existing add to cart logic
});
```

**Update JSX:**
```typescript
// ✅ Pass handlers directly as props
<StyleSelection
  onStyleSelect$={handleStyleSelect}
  hasStock={hasStock}
  isLoadingStep={isLoadingStep}
/>

<SizeColorSelection
  onSizeSelect$={handleSizeSelect}
  onColorSelect$={handleColorSelect}
  onPrevStep$={prevStep}
  onToggleSizeChart$={toggleSizeChart}
  onImageSelect$={handleImageSelect}
  onTouchStart$={handleTouchStart}
  onTouchMove$={handleTouchMove}
  onTouchEnd$={handleTouchEnd}
  // ... other props
/>

<AddToCartFlow
  onAddToCart$={handleAddToCart}
  isAddingToCart={isAddingToCart}
  // ... other props
/>
```

### Step 3: Update Child Components

**StyleSelection.tsx & StyleSelection-v2.tsx:**

```typescript
// ✅ Add proper TypeScript interface
interface StyleSelectionProps {
  onStyleSelect$: QRL<(style: 'short' | 'long') => void>;
  hasStock: Signal<{ shortSleeve: boolean; longSleeve: boolean }>;
  isLoadingStep: Signal<boolean>;
}

export const StyleSelection = component$<StyleSelectionProps>((props) => {
  return (
    <button
      onClick$={() => {
        if (props.isLoadingStep.value) return;
        if (props.hasStock.value.shortSleeve) {
          props.onStyleSelect$('short'); // ✅ Direct call
        }
      }}
    >
      Short Sleeve
    </button>
  );
});
```

**SizeColorSelection.tsx & SizeColorSelection-v2.tsx:**

```typescript
// ✅ Add proper TypeScript interface
interface SizeColorSelectionProps {
  onSizeSelect$: QRL<(size: string) => void>;
  onColorSelect$: QRL<(color: string) => void>;
  onPrevStep$: QRL<() => void>;
  onToggleSizeChart$: QRL<() => void>;
  onImageSelect$: QRL<(asset: any) => void>;
  onTouchStart$: QRL<(touch: { clientX: number; clientY: number }) => void>;
  onTouchMove$: QRL<(touch: { clientX: number; clientY: number }) => void>;
  onTouchEnd$: QRL<() => void>;
  // ... other props
}

export const SizeColorSelection = component$<SizeColorSelectionProps>((props) => {
  return (
    <>
      <button onClick$={() => props.onSizeSelect$('small')}>Small</button>
      <button onClick$={() => props.onColorSelect$('black')}>Black</button>
      <button onClick$={() => props.onPrevStep$()}>Back</button>
      <button onClick$={() => props.onToggleSizeChart$()}>Size Chart</button>
      
      <img
        onClick$={() => props.onImageSelect$(asset)}
        onTouchStart$={(e) => {
          const touch = e.touches[0];
          if (touch) {
            props.onTouchStart$({ clientX: touch.clientX, clientY: touch.clientY });
          }
        }}
        onTouchMove$={(e) => {
          const touch = e.touches[0];
          if (touch) {
            props.onTouchMove$({ clientX: touch.clientX, clientY: touch.clientY });
          }
        }}
        onTouchEnd$={() => props.onTouchEnd$()}
      />
    </>
  );
});
```

**AddToCartFlow.tsx & AddToCartFlow-v2.tsx:**

```typescript
// ✅ Add proper TypeScript interface
interface AddToCartFlowProps {
  onAddToCart$: QRL<() => void>;
  isAddingToCart: Signal<boolean>;
  // ... other props
}

export const AddToCartFlow = component$<AddToCartFlowProps>((props) => {
  return (
    <button
      onClick$={() => props.onAddToCart$()} // ✅ Direct call
      disabled={props.isAddingToCart.value}
    >
      Add to Cart
    </button>
  );
});
```

---

## 📊 Impact Analysis

### Files to Modify
1. ✏️ `frontend/src/components/shop/ShopComponent.tsx` - Remove triggers, remove watchers, pass handlers
2. ✏️ `frontend/src/components/shop/StyleSelection.tsx` - Add interface, replace trigger with handler
3. ✏️ `frontend/src/components/shop/StyleSelection-v2.tsx` - Add interface, replace trigger with handler
4. ✏️ `frontend/src/components/shop/SizeColorSelection.tsx` - Add interface, replace triggers with handlers
5. ✏️ `frontend/src/components/shop/SizeColorSelection-v2.tsx` - Add interface, replace triggers with handlers
6. ✏️ `frontend/src/components/shop/AddToCartFlow.tsx` - Add interface, replace trigger with handler
7. ✏️ `frontend/src/components/shop/AddToCartFlow-v2.tsx` - Add interface, replace trigger with handler

### Lines of Code
- **Remove**: ~50 lines (trigger signals + watchers)
- **Add**: ~30 lines (new simple handlers)
- **Modify**: ~40 lines (child component interfaces + onClick$ calls)
- **Net Change**: ~20 lines removed

### Benefits
1. ✅ **Performance**: Remove 8+ unnecessary `useVisibleTask$` watchers
2. ✅ **Simplicity**: Direct event flow, easier to understand
3. ✅ **Best Practice**: Follows Qwik official recommendations
4. ✅ **Type Safety**: Proper TypeScript interfaces with QRL types
5. ✅ **Maintainability**: Clearer code, easier to debug
6. ✅ **Resumability**: Better for Qwik's resumability model

### Risks
- ⚠️ **Testing Required**: Need to test all user interactions after refactor
- ⚠️ **Behavior Changes**: Ensure exact same UX after refactor
- ⚠️ **Edge Cases**: Touch events and swipe logic need careful migration

---

## 🧪 Testing Checklist

After implementing the refactor, test:

- [ ] Style selection (short/long sleeve buttons)
- [ ] Size selection (small/medium/large buttons)
- [ ] Color selection (all 9 colors)
- [ ] Back button navigation
- [ ] Size chart toggle
- [ ] Image gallery selection (click thumbnails)
- [ ] Touch swipe gestures on mobile
- [ ] Add to cart button
- [ ] Loading states during transitions
- [ ] Stock checking and disabled states

---

## 🚀 Implementation Plan

### Phase 1: Preparation
1. Create feature branch: `refactor/remove-trigger-pattern`
2. Review this proposal with team
3. Ensure all tests pass before starting

### Phase 2: Implementation
1. Update ShopComponent.tsx (parent)
   - Remove trigger signals
   - Remove useVisibleTask$ watchers
   - Add new simple handlers
   - Update JSX to pass handlers
2. Update all child components
   - Add TypeScript interfaces with QRL types
   - Replace trigger.value = X with props.onEvent$(X)
3. Test each component individually

### Phase 3: Testing & Validation
1. Run `pnpm run build` to check for TypeScript errors
2. Test all user interactions manually
3. Verify timing logs still work correctly
4. Check browser console for errors

### Phase 4: Deployment
1. Merge to master after approval
2. Deploy to production
3. Monitor for any issues

---

## 📚 References

- [Qwik Best Practices - Event Handling](https://qwik.dev/docs/guides/best-practices/)
- [Qwik Components - Events](https://qwik.dev/docs/components/events/)
- [Qwik Components - Props](https://qwik.dev/docs/components/props/)
- [Qwik Tasks - useVisibleTask$](https://qwik.dev/docs/components/tasks/#usevisibletask)

---

## 💡 Key Takeaway

**The trigger pattern with `useVisibleTask$` watchers is an anti-pattern in Qwik.**

The correct approach is to pass event handlers directly as props using QRL types, allowing child components to call parent handlers directly. This follows Qwik's component communication model and provides better performance, maintainability, and resumability.

