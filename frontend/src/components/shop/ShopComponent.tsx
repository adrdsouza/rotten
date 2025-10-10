import { component$, useSignal, $, useContext, useTask$ } from '@qwik.dev/core';
import { useLocalCart, addToLocalCart, refreshCartStock } from '~/contexts/CartContext';
import { APP_STATE } from '~/constants';
import { loadCountryOnDemand } from '~/utils/addressStorage';


import { StyleSelection } from './StyleSelection';
import { SizeColorSelection } from './SizeColorSelection';

import { PRODUCTS, getVariantId } from '~/data/shop-constants';
import { checkVariantStock, checkProductsHaveStock, loadProductFeaturedImage, loadProductGallery, loadVariantFeaturedImage, loadVariantGallery } from '~/services/shop-queries';
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

  // Stock & availability - NON-BLOCKING: useTask$ runs immediately without blocking page load
  const stockMap = useSignal<Map<string, number>>(new Map());
  const hasStock = useSignal<{ shortSleeve: boolean; longSleeve: boolean }>({ shortSleeve: false, longSleeve: false });

  // Phase 1: Non-blocking stock check that runs immediately on mount
  useTask$(async () => {
    const phase1Start = performance.now();
    console.log('🚀 Phase 1 START: Product-level stock check (OPTIMIZED)');

    try {
      // 🚀 Step 1: Check if products have stock (boolean check)
      const stockStart = performance.now();
      const stockResult = await checkProductsHaveStock();
      const stockEnd = performance.now();
      console.log(`📊 Product stock check completed in ${(stockEnd - stockStart).toFixed(2)}ms`);
      console.log(`✅ Stock status: Short=${stockResult.shortSleeve}, Long=${stockResult.longSleeve}`);

      // Update hasStock signal
      hasStock.value = stockResult;

      // 🚀 Step 2: Query size-level stock for in-stock styles (so sizes appear instantly when clicked)
      const sizeStockStart = performance.now();
      const { SIZES, COLORS } = await import('~/data/shop-constants');
      const stylesToQuery: Array<'short' | 'long'> = [];
      if (stockResult.shortSleeve) stylesToQuery.push('short');
      if (stockResult.longSleeve) stylesToQuery.push('long');

      const sizeStockMap = new Map<string, number>();

      for (const style of stylesToQuery) {
        const sizeVariantIds: string[] = [];

        // Collect all variant IDs for all sizes (across all colors) for this style
        SIZES.forEach(size => {
          COLORS.forEach(color => {
            const id = getVariantId(style, size.code, color.code);
            if (id) sizeVariantIds.push(id);
          });
        });

        if (sizeVariantIds.length > 0) {
          const stockData = await checkVariantStock(sizeVariantIds);
          stockData.forEach((qty, variantId) => sizeStockMap.set(variantId, qty));
          console.log(`📊 ${style} sleeve: Queried ${sizeVariantIds.length} variants for size availability`);
        }
      }

      const sizeStockEnd = performance.now();
      console.log(`📊 Size-level stock check completed in ${(sizeStockEnd - sizeStockStart).toFixed(2)}ms`);

      // Update stockMap signal
      stockMap.value = sizeStockMap;

      // 🚀 Step 3: Warm featured images for in-stock styles (non-blocking)
      const imageStart = performance.now();
      const imagePromises = [];
      for (const style of stylesToQuery) {
        const productId = style === 'short' ? PRODUCTS.shortSleeve.productId : PRODUCTS.longSleeve.productId;
        const cached = shopCache.getCachedProductFeaturedImage(productId);
        if (!cached) {
          imagePromises.push(
            loadProductFeaturedImage(productId).then(image => {
              if (image) {
                shopCache.cacheProductFeaturedImage(productId, image);
                console.log(`🖼️ ${style} sleeve featured image cached`);
              }
            })
          );
        } else {
          console.log(`💾 ${style} sleeve featured image loaded from cache`);
        }
      }

      await Promise.all(imagePromises);
      const imageEnd = performance.now();
      console.log(`🖼️ Featured images processed in ${(imageEnd - imageStart).toFixed(2)}ms`);

      const phase1End = performance.now();
      console.log(`🏁 Phase 1 COMPLETE in ${(phase1End - phase1Start).toFixed(2)}ms`);
    } catch (err) {
      console.error('❌ Phase 1 initialization error:', err);
      hasStock.value = { shortSleeve: false, longSleeve: false };
    }
  });

  // Touch state (for swipe)
  const touchStartX = useSignal<number | null>(null);
  const touchEndX = useSignal<number | null>(null);

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
    const phase2Start = performance.now();
    console.log(`🎯 Phase 2 START: Style selected (${style})`);

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

    // Phase 2: Load product images (stock already queried in Phase 1)
    try {
      isLoadingStep.value = true;
      const productId = style === 'short' ? PRODUCTS.shortSleeve.productId : PRODUCTS.longSleeve.productId;

      // Featured image (cache first)
      const featuredStart = performance.now();
      let featured = shopCache.getCachedProductFeaturedImage(productId);
      if (!featured) {
        featured = await loadProductFeaturedImage(productId);
        if (featured) shopCache.cacheProductFeaturedImage(productId, featured);
        console.log(`🖼️ Product featured image loaded in ${(performance.now() - featuredStart).toFixed(2)}ms`);
      } else {
        console.log(`💾 Product featured image from cache in ${(performance.now() - featuredStart).toFixed(2)}ms`);
      }
      productAssets.value = { featuredAsset: featured, assets: [], variantFeaturedAsset: null };
      if (featured) currentProductImage.value = featured;

      // Gallery (non-blocking)
      assetsLoading.value = true;
      const galleryStart = performance.now();
      const gallery = await loadProductGallery(productId);
      console.log(`🖼️ Product gallery loaded in ${(performance.now() - galleryStart).toFixed(2)}ms`);
      productAssets.value = { ...productAssets.value, featuredAsset: gallery.featuredAsset || featured, assets: gallery.assets || [] };
      assetsLoading.value = false;

      const phase2End = performance.now();
      console.log(`🏁 Phase 2 COMPLETE in ${(phase2End - phase2Start).toFixed(2)}ms`);
    } catch (e) {
      console.error('❌ Phase 2 failed to load product assets:', e);
      assetsLoading.value = false;
    } finally {
      isLoadingStep.value = false;
    }
  });

  const handleSizeSelect = $(async (sizeCode: string) => {
    const phase3Start = performance.now();
    console.log(`📏 Phase 3 START: Size selected (${sizeCode})`);

    selectedSize.value = sizeCode;
    selectedColor.value = null;
    selectedVariantId.value = '';
    currentStep.value = 2;

    // Phase 3: Refresh stock for all colors of this size; warm variant featured images for in-stock colors
    if (!selectedStyle.value) return;
    try {
      const stockStart = performance.now();
      const colorVariantIds: string[] = [];
      const colors = (await import('~/data/shop-constants')).COLORS;
      colors.forEach(c => {
        const id = getVariantId(selectedStyle.value!, sizeCode, c.code);
        if (id) colorVariantIds.push(id);
      });
      if (colorVariantIds.length > 0) {
        const fresh = await checkVariantStock(colorVariantIds);
        const stockEnd = performance.now();
        console.log(`📊 Size-specific stock check completed in ${(stockEnd - stockStart).toFixed(2)}ms`);

        // Merge fresh into stockMap
        const merged = new Map(stockMap.value);
        fresh.forEach((v, k) => merged.set(k, v));
        stockMap.value = merged;

        // Warm variant featured images for in-stock colors
        const imageStart = performance.now();
        let imageCount = 0;
        for (const vid of colorVariantIds) {
          const qty = fresh.get(vid) || 0;
          if (qty > 0 && !shopCache.getCachedVariantFeaturedImage(vid)) {
            const vImg = await loadVariantFeaturedImage(vid);
            if (vImg) {
              shopCache.cacheVariantFeaturedImage(vid, vImg);
              imageCount++;
            }
          }
        }
        const imageEnd = performance.now();
        console.log(`🖼️ Warmed ${imageCount} variant featured images in ${(imageEnd - imageStart).toFixed(2)}ms`);
      }

      const phase3End = performance.now();
      console.log(`🏁 Phase 3 COMPLETE in ${(phase3End - phase3Start).toFixed(2)}ms`);
    } catch (e) {
      console.error('❌ Phase 3 failed refreshing size stock/images:', e);
    }
  });

  const handleColorSelect = $(async (colorCode: string) => {
    const phase4Start = performance.now();
    console.log(`🎨 Phase 4 START: Color selected (${colorCode})`);

    selectedColor.value = colorCode;

    // Determine variant
    await updateVariantSelection();
    const vid = selectedVariantId.value;
    if (!vid) return;
    console.log(`🔍 Variant ID determined: ${vid}`);

    // Phase 4: Ensure variant featured image and gallery are ready
    try {
      const featuredStart = performance.now();
      let vFeatured = shopCache.getCachedVariantFeaturedImage(vid);
      if (!vFeatured) {
        vFeatured = await loadVariantFeaturedImage(vid);
        if (vFeatured) shopCache.cacheVariantFeaturedImage(vid, vFeatured);
        console.log(`🖼️ Variant featured image loaded in ${(performance.now() - featuredStart).toFixed(2)}ms`);
      } else {
        console.log(`💾 Variant featured image from cache in ${(performance.now() - featuredStart).toFixed(2)}ms`);
      }

      if (vFeatured) {
        productAssets.value = { ...productAssets.value, variantFeaturedAsset: vFeatured };
        currentProductImage.value = vFeatured;
        console.log(`✅ Variant featured image set as current image`);
      } else {
        // Use placeholder image when no variant featured image exists
        const placeholderAsset = {
          id: 'placeholder',
          preview: '/asset_placeholder.webp',
          source: '/asset_placeholder.webp'
        };
        productAssets.value = { ...productAssets.value, variantFeaturedAsset: placeholderAsset };
        currentProductImage.value = placeholderAsset;
        console.log(`🖼️ Using placeholder image for variant ${vid} (no featured image found)`);
      }

      const galleryStart = performance.now();
      const vGallery = shopCache.getCachedVariantGallery(vid);
      if (!vGallery) {
        const loaded = await loadVariantGallery(vid);
        if (loaded) {
          shopCache.cacheVariantGallery(vid, loaded);
          console.log(`🖼️ Variant gallery loaded in ${(performance.now() - galleryStart).toFixed(2)}ms`);
        }
      } else {
        console.log(`💾 Variant gallery from cache in ${(performance.now() - galleryStart).toFixed(2)}ms`);
      }

      const phase4End = performance.now();
      console.log(`🏁 Phase 4 COMPLETE in ${(phase4End - phase4Start).toFixed(2)}ms`);
    } catch (e) {
      console.error('❌ Phase 4 failed loading variant images:', e);
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
      <StyleSelection
        selectedStyle={selectedStyle}
        isLoadingStep={isLoadingStep}
        onStyleSelect$={handleStyleSelect}
        hasStock={hasStock}
      />

      {/* Product Customization Section */}
      {selectedStyle.value && (
        <div id={props.context === 'standalone' ? 'customization-section' : props.scrollTarget}>
          <SizeColorSelection
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

