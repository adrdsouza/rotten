import { component$, useSignal, $, useContext, useVisibleTask$ } from '@qwik.dev/core';
import { useLocalCart, addToLocalCart, refreshCartStock } from '~/contexts/CartContext';
import { APP_STATE } from '~/constants';
import { loadCountryOnDemand } from '~/utils/addressStorage';


import { StyleSelection as StyleSelectionV2 } from './StyleSelection-v2';
import { SizeColorSelection as SizeColorSelectionV2 } from './SizeColorSelection-v2';

import { PRODUCTS, getVariantId, getStyleVariantIds } from '~/data/shop-constants';
import { checkVariantStock, checkStyleHasStock, loadProductFeaturedImage, loadProductGallery, loadVariantFeaturedImage, loadVariantGallery } from '~/services/shop-queries';
import { shopCache } from '~/services/shop-cache';

export interface ShopComponentProps {
  context: 'homepage' | 'standalone';
  scrollTarget?: string;
}

export const ShopComponent = component$<ShopComponentProps>((props) => {
  const localCart = useLocalCart();
  const appState = useContext(APP_STATE);

  // Flow state
  const selectedStyle = useSignal<'short' | 'long' | null>(null);
  const currentStep = useSignal<number>(1); // 1: Size, 2: Color

  // Selection state (simplified)
  const selectedSize = useSignal<string | null>(null);
  const selectedColor = useSignal<string | null>(null);
  const selectedVariantId = useSignal<string>('');

  // UI state
  const isLoadingStep = useSignal<boolean>(false);
  const showSizeChart = useSignal<boolean>(false);
  const isAddingToCart = useSignal<boolean>(false);

  // Image state (preserve behavior)
  const currentProductImage = useSignal<any>(null);
  const productAssets = useSignal<any>({ featuredAsset: null, assets: [], variantFeaturedAsset: null });
  const assetsLoading = useSignal<boolean>(false);

  // Stock & availability
  const stockMap = useSignal<Map<string, number>>(new Map());
  const hasStock = useSignal<{ shortSleeve: boolean; longSleeve: boolean }>({ shortSleeve: false, longSleeve: false });

  // Touch state (for swipe)
  const touchStartX = useSignal<number | null>(null);
  const touchEndX = useSignal<number | null>(null);

  // Phase 1: Page load — check stock and warm featured product images (from cache if available)
  useVisibleTask$(async () => {
    try {
      // Query stock for all variants once on page load
      const shortIds = getStyleVariantIds('short');
      const longIds = getStyleVariantIds('long');
      const allIds = [...shortIds, ...longIds];
      const stock = await checkVariantStock(allIds);
      stockMap.value = stock;

      hasStock.value = {
        shortSleeve: checkStyleHasStock(stock, shortIds),
        longSleeve: checkStyleHasStock(stock, longIds),
      };

      // Warm featured images for in-stock styles
      const stylesToWarm: Array<'short' | 'long'> = [];
      if (hasStock.value.shortSleeve) stylesToWarm.push('short');
      if (hasStock.value.longSleeve) stylesToWarm.push('long');

      for (const style of stylesToWarm) {
        const productId = style === 'short' ? PRODUCTS.shortSleeve.productId : PRODUCTS.longSleeve.productId;
        const cached = shopCache.getCachedProductFeaturedImage(productId);
        if (!cached) {
          const image = await loadProductFeaturedImage(productId);
          if (image) shopCache.cacheProductFeaturedImage(productId, image);
        }
      }
    } catch (err) {
      console.warn('Initial stock/image warm-up failed:', err);
    }
  });

  // Helpers
  const updateVariantSelection = $(() => {
    if (!selectedStyle.value || !selectedSize.value || !selectedColor.value) {
      selectedVariantId.value = '';
      return;
    }
    const variantId = getVariantId(selectedStyle.value, selectedSize.value, selectedColor.value);
    selectedVariantId.value = variantId || '';

    // Update image priority: variant image first, then product featured
    if (variantId) {
      const cachedVariant = shopCache.getCachedVariantFeaturedImage(variantId);
      if (cachedVariant) {
        productAssets.value = { ...productAssets.value, variantFeaturedAsset: cachedVariant };
        currentProductImage.value = cachedVariant;
      }
    }
    if (!currentProductImage.value && productAssets.value.featuredAsset) {
      currentProductImage.value = productAssets.value.featuredAsset;
    }
  });

  const handleStyleSelect = $(async (style: 'short' | 'long') => {
    selectedStyle.value = style;
    // Reset downstream selections
    selectedSize.value = null;
    selectedColor.value = null;
    selectedVariantId.value = '';
    currentStep.value = 1;

    // Scroll into view (preserve UX)
    setTimeout(() => {
      const scrollTarget = props.context === 'standalone' ? 'customization-section' : (props.scrollTarget || 'customization-section');
      const customizationSection = document.getElementById(scrollTarget);
      if (customizationSection) {
        const headerHeight = 64;
        const offset = 20;
        const rect = customizationSection.getBoundingClientRect();
        window.scrollTo({ top: window.scrollY + rect.top - headerHeight - offset, behavior: 'smooth' });
      }
    }, 200);

    // Phase 2: Load product featured, then gallery
    try {
      isLoadingStep.value = true;
      const productId = style === 'short' ? PRODUCTS.shortSleeve.productId : PRODUCTS.longSleeve.productId;

      // Featured image (cache first)
      let featured = shopCache.getCachedProductFeaturedImage(productId);
      if (!featured) {
        featured = await loadProductFeaturedImage(productId);
        if (featured) shopCache.cacheProductFeaturedImage(productId, featured);
      }
      productAssets.value = { featuredAsset: featured, assets: [], variantFeaturedAsset: null };
      if (featured) currentProductImage.value = featured;

      // Gallery (non-blocking)
      assetsLoading.value = true;
      const gallery = await loadProductGallery(productId);
      productAssets.value = { ...productAssets.value, featuredAsset: gallery.featuredAsset || featured, assets: gallery.assets || [] };
      assetsLoading.value = false;
    } catch (e) {
      console.warn('Failed to load product assets:', e);
      assetsLoading.value = false;
    } finally {
      isLoadingStep.value = false;
    }
  });

  const handleSizeSelect = $(async (sizeCode: string) => {
    selectedSize.value = sizeCode;
    selectedColor.value = null;
    selectedVariantId.value = '';
    currentStep.value = 2;

    // Phase 3: Refresh stock for all colors of this size; warm variant featured images for in-stock colors
    if (!selectedStyle.value) return;
    try {
      const colorVariantIds: string[] = [];
      const colors = (await import('~/data/shop-constants')).COLORS;
      colors.forEach(c => {
        const id = getVariantId(selectedStyle.value!, sizeCode, c.code);
        if (id) colorVariantIds.push(id);
      });
      if (colorVariantIds.length > 0) {
        const fresh = await checkVariantStock(colorVariantIds);
        // Merge fresh into stockMap
        const merged = new Map(stockMap.value);
        fresh.forEach((v, k) => merged.set(k, v));
        stockMap.value = merged;

        // Warm variant featured images for in-stock colors
        for (const vid of colorVariantIds) {
          const qty = fresh.get(vid) || 0;
          if (qty > 0 && !shopCache.getCachedVariantFeaturedImage(vid)) {
            const vImg = await loadVariantFeaturedImage(vid);
            if (vImg) shopCache.cacheVariantFeaturedImage(vid, vImg);
          }
        }
      }
    } catch (e) {
      console.warn('Failed refreshing size stock/images:', e);
    }
  });

  const handleColorSelect = $(async (colorCode: string) => {
    selectedColor.value = colorCode;

    // Determine variant
    await updateVariantSelection();
    const vid = selectedVariantId.value;
    if (!vid) return;

    // Phase 4: Ensure variant featured image and gallery are ready
    try {
      let vFeatured = shopCache.getCachedVariantFeaturedImage(vid);
      if (!vFeatured) {
        vFeatured = await loadVariantFeaturedImage(vid);
        if (vFeatured) shopCache.cacheVariantFeaturedImage(vid, vFeatured);
      }
      if (vFeatured) {
        productAssets.value = { ...productAssets.value, variantFeaturedAsset: vFeatured };
        currentProductImage.value = vFeatured;
      }

      const vGallery = shopCache.getCachedVariantGallery(vid);
      if (!vGallery) {
        const loaded = await loadVariantGallery(vid);
        if (loaded) shopCache.cacheVariantGallery(vid, loaded);
      }
    } catch (e) {
      console.warn('Failed loading variant images:', e);
    }

    // Early geolocation to prep checkout
    loadCountryOnDemand(appState).catch(() => {});
  });

  const prevStep = $(() => {
    if (currentStep.value > 1) {
      currentStep.value--;
      if (currentStep.value === 1) {
        selectedColor.value = null;
        selectedVariantId.value = '';
        productAssets.value = { ...productAssets.value, variantFeaturedAsset: null };
      }
    }
  });

  // Add to cart (build item using simplified data)
  const handleAddToCart = $(async () => {
    if (!selectedVariantId.value || !selectedStyle.value || !selectedSize.value || !selectedColor.value) return;

    isAddingToCart.value = true;
    try {
      const style = selectedStyle.value;
      const variantId = selectedVariantId.value;
      const productMeta = style === 'short' ? PRODUCTS.shortSleeve : PRODUCTS.longSleeve;
      const priceWithTax = productMeta.price; // cents
      const stockLevel = (stockMap.value.get(variantId) || 0).toString();

      const localCartItem = {
        productVariantId: variantId,
        quantity: 1,
        productVariant: {
          id: variantId,
          name: `${productMeta.name} - ${selectedSize.value} - ${selectedColor.value}`,
          priceWithTax,
          stockLevel,
          product: {
            id: productMeta.productId,
            name: productMeta.name,
            slug: productMeta.slug,
          },
          options: [
            { id: `size-${selectedSize.value}`, name: selectedSize.value!, group: { name: 'Size' } },
            { id: `color-${selectedColor.value}`, name: selectedColor.value!, group: { name: 'Color' } },
          ],
          featuredAsset: productAssets.value.variantFeaturedAsset || productAssets.value.featuredAsset || null,
        },
      };

      await addToLocalCart(localCart, localCartItem);

      // Open cart and refresh stock in background
      (appState as any).showCart = true;
      if (localCart.localCart.items.length > 0) {
        refreshCartStock(localCart).catch(() => {});
      }
      // Trigger header badge update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart-updated'));
      }
    } catch (e) {
      console.error('Failed to add to cart:', e);
    } finally {
      isAddingToCart.value = false;
    }
  });

  // UI action handlers - BEST PRACTICE: Direct event handlers
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
      const allAssets: any[] = [];
      if (productAssets.value.variantFeaturedAsset) allAssets.push(productAssets.value.variantFeaturedAsset);
      if (productAssets.value.featuredAsset) allAssets.push(productAssets.value.featuredAsset);
      if (productAssets.value.assets && productAssets.value.assets.length > 0) {
        productAssets.value.assets.forEach((asset: any) => {
          const exists = allAssets.some(a => a.id === asset.id);
          if (!exists) allAssets.push(asset);
        });
      }
      if (allAssets.length > 1) {
        const currentIndex = allAssets.findIndex(asset => asset.id === currentProductImage.value?.id);
        if (Math.abs(diffX) > minSwipeDistance) {
          if (diffX > 0 && currentIndex < allAssets.length - 1) currentProductImage.value = allAssets[currentIndex + 1];
          else if (diffX < 0 && currentIndex > 0) currentProductImage.value = allAssets[currentIndex - 1];
        }
      }
      touchStartX.value = null;
      touchEndX.value = null;
    }
  });

  return (
    <div class="shop-component">
      {/* Style Selection Section - BEST PRACTICE: Direct event handlers */}
      <StyleSelectionV2
        selectedStyle={selectedStyle}
        isLoadingStep={isLoadingStep}
        onStyleSelect$={handleStyleSelect}
        hasStock={hasStock}
      />

      {/* Product Customization Section */}
      {selectedStyle.value && (
        <div id={props.context === 'standalone' ? 'customization-section' : props.scrollTarget}>
          <SizeColorSelectionV2
            selectedStyle={selectedStyle}
            selectedSize={selectedSize}
            selectedColor={selectedColor}
            selectedVariantId={selectedVariantId}
            currentStep={currentStep}
            showSizeChart={showSizeChart}
            currentProductImage={currentProductImage}
            productAssets={productAssets}
            assetsLoading={assetsLoading}
            touchStartX={touchStartX}
            touchEndX={touchEndX}
            isAddingToCart={isAddingToCart}
            stockMap={stockMap}
            onSizeSelect$={handleSizeSelect}
            onColorSelect$={handleColorSelect}
            onPrevStep$={prevStep}
            onToggleSizeChart$={toggleSizeChart}
            onImageSelect$={handleImageSelect}
            onTouchStart$={handleTouchStart}
            onTouchMove$={handleTouchMove}
            onTouchEnd$={handleTouchEnd}
            onAddToCart$={handleAddToCart}
          />
        </div>
      )}
    </div>
  );
});

