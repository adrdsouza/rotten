import { component$, Signal, type QRL } from '@qwik.dev/core';

export interface AddToCartFlowProps {
  selectedVariantId: Signal<string>;
  currentStep: Signal<number>;
  isAddingToCart: Signal<boolean>;
  onAddToCart$: QRL<() => void>; // Direct event handler
}

export const AddToCartFlow = component$<AddToCartFlowProps>((props) => {

  return (
    <>
      {/* Add to Cart Button - Only show when both size and color are selected */}
      {props.selectedVariantId.value && props.currentStep.value === 2 && (
        <div class="mt-6">
          <button
            onClick$={() => {
              props.onAddToCart$();
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
