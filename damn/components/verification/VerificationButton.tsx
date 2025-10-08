import { component$, useSignal, $ } from '@qwik.dev/core';

// Import the modal component directly
import VerificationModal from './VerificationModal';
import { CheckCircleIcon } from 'lucide-qwik';

interface VerificationButtonProps {
  customerId?: string;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'sm' | 'md' | 'lg';
  class?: string;
}

export default component$<VerificationButtonProps>(({ 
  customerId, 
  variant = 'primary', 
  size = 'md',
  class: className = ''
}) => {
  const showModal = useSignal(false);

  const openModal = $(() => {
    showModal.value = true;
    // Prevent body scroll when modal is open
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  });

  const closeModal = $(() => {
    showModal.value = false;
    // Restore body scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  });

  // Button styling based on variant and size
  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer';

    const variantClasses = {
      primary: 'bg-gray-900 text-white hover:bg-black focus:ring-gray-500',
      secondary: 'bg-[#d42838] text-white hover:bg-black focus:ring-[#d42838]',
      text: 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500'
    };

    const sizeClasses = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  };

  return (
    <>
      <button
        onClick$={openModal}
        class={getButtonClasses()}
        aria-label="Verify your status for exclusive discounts"
      >
        <CheckCircleIcon class="w-5 h-5 mr-2" />
        Verify Status
      </button>

      {/* Conditionally render modal */}
      {showModal.value && (
        <VerificationModal
          isOpen={showModal.value}
          customerId={customerId}
          onClose$={closeModal}
        />
      )}
    </>
  );
});
