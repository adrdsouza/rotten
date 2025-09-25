import { component$, Signal } from '@qwik.dev/core';
import { Product, ProductOption } from '~/types';

export interface AddToCartFlowProps {
  selectedProduct: Signal<Product | null>;
  selectedSize: Signal<ProductOption | null>;
  selectedColor: Signal<ProductOption | null>;
  selectedVariantId: Signal<string>;
  currentStep: Signal<number>;
  isAddingToCart: Signal<boolean>;
  addToCartTrigger: Signal<boolean>; // Signal to trigger add to cart action
}

export const AddToCartFlow = component$<AddToCartFlowProps>((props) => {

  return (
    <>
      {/* Add to Cart Button - Only show when both size and color are selected */}
      {props.selectedVariantId.value && props.currentStep.value === 2 && (
        <div class="mt-6">
          <button
            onClick$={() => {
              // Trigger the add to cart action by toggling the signal
              props.addToCartTrigger.value = !props.addToCartTrigger.value;
            }}
            disabled={props.isAddingToCart.value}
            class={{
              'w-full py-4 px-6 rounded-xl font-medium text-lg transition-all duration-300 transform': true,
              'bg-[#8a6d4a] text-white hover:bg-[#4F3B26] hover:scale-105 shadow-lg hover:shadow-xl': !props.isAddingToCart.value,
              'bg-gray-400 text-gray-200 cursor-not-allowed': props.isAddingToCart.value
            }}
          >
            {props.isAddingToCart.value ? (
              <div class="flex items-center justify-center">
                <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Adding to Cart...
              </div>
            ) : (
              'Add to Cart'
            )}
          </button>
        </div>
      )}
    </>
  );
});
