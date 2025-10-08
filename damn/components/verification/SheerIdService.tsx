import { component$, useSignal, useStore, useVisibleTask$, noSerialize, type NoSerialize } from '@qwik.dev/core';
import type { VerificationProgram } from './types';

interface SheerIdServiceProps {
  program: VerificationProgram;
  customerId: string | null;
}

interface SheerIdForm {
  setOptions: (options: { logLevel?: string }) => void;
  setViewModel: (viewModel: { metadata?: Record<string, any> }) => void;
  on: (event: string, callback: (data: any) => void) => () => void;
  once: (event: string, callback: (data: any) => void) => () => void;
}

/**
 * SheerID Service Component using official JavaScript Library
 * Follows Qwik patterns for third-party library integration
 */
export const SheerIdService = component$<SheerIdServiceProps>(({
  program,
  customerId
}) => {
  const containerRef = useSignal<HTMLDivElement>();
  const isLoading = useSignal(true);
  const error = useSignal<string>();
  const verificationStatus = useSignal<'ready' | 'success' | 'failed' | null>(null);
  const verificationResponse = useSignal<any>();

  // Store for non-serializable SheerID form instance
  const store = useStore<{
    sheerIdForm: NoSerialize<SheerIdForm>
  }>({
    sheerIdForm: undefined,
  });

  useVisibleTask$(({ track }) => {
    track(() => containerRef.value);
    track(() => program);
    track(() => customerId);

    if (!containerRef.value) return;

    const initializeSheerID = async () => {
      try {
        // Wait for SheerID library to load (it's loaded in head)
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        while (!(window as any).sheerId && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!(window as any).sheerId) {
          throw new Error('SheerID library failed to load');
        }

        const sheerId = (window as any).sheerId;
        
        // Clear any existing content
        if (containerRef.value) {
          containerRef.value.innerHTML = '';
        }

        // Create program URL
        const programUrl = `https://services.sheerid.com/verify/${program.sheerIdProgramId}/`;
        
        // Load inline iframe using SheerID library
        const myForm = sheerId.loadInlineIframe(containerRef.value, programUrl);

        // Store the form instance using noSerialize (following Qwik patterns)
        store.sheerIdForm = noSerialize(myForm);

        // Configure options
        myForm.setOptions({
          logLevel: 'info'
        });

        // Set metadata using proper SheerID method - TEST: Include customer ID
        myForm.setViewModel({
          metadata: {
            programId: program.id,
            category: program.category,
            discountPercent: program.discountPercent,
            customerId: customerId || 'anonymous',
            // Add timestamp for testing
            testTimestamp: new Date().toISOString()
          }
        });

        console.log('SheerID metadata set:', {
          programId: program.id,
          category: program.category,
          discountPercent: program.discountPercent,
          customerId: customerId || 'anonymous',
          testTimestamp: new Date().toISOString()
        });

        // Set up event handlers (using signals instead of callbacks)
        myForm.on('ON_VERIFICATION_READY', () => {
          isLoading.value = false;
          verificationStatus.value = 'ready';
        });

        myForm.on('ON_VERIFICATION_SUCCESS', (response: any) => {
          console.log('SheerID verification successful:', response);
          verificationStatus.value = 'success';
          verificationResponse.value = response;
        });

        myForm.on('ON_VERIFICATION_STEP_CHANGE', (response: any) => {
          console.log('SheerID step change:', response.currentStep);

          // Handle error states
          if (response.currentStep === 'error') {
            const errorMessage = response.errors?.[0]?.message || 'Verification failed';
            error.value = errorMessage;
            verificationStatus.value = 'failed';
          }
        });

        console.log('SheerID form initialized successfully');

      } catch (err) {
        console.error('Failed to initialize SheerID:', err);
        error.value = err instanceof Error ? err.message : 'Failed to load verification form';
        isLoading.value = false;
        verificationStatus.value = 'failed';
      }
    };

    initializeSheerID();
  });

  return (
    <div class="sheerid-service">
      {isLoading.value && (
        <div class="flex items-center justify-center p-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span class="ml-3 text-gray-600">Loading verification form...</span>
        </div>
      )}
      
      {error.value && (
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Verification Error</h3>
              <p class="mt-1 text-sm text-red-700">{error.value}</p>
              <p class="mt-2 text-xs text-red-600">
                Please try again or contact support if the problem persists.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div
        ref={containerRef}
        class="sheerid-container w-full min-h-[600px] bg-white rounded-lg overflow-hidden"
        style={{
          display: error.value ? 'none' : 'block',
          minHeight: '600px'
        }}
      />
    </div>
  );
});

// Global type declaration for SheerID library
declare global {
  interface Window {
    sheerId: {
      loadInlineIframe: (container: HTMLElement, programUrl: string) => {
        setOptions: (options: { logLevel?: string }) => void;
        setViewModel: (viewModel: { metadata?: Record<string, any> }) => void;
        on: (event: string, callback: (data: any) => void) => () => void;
        once: (event: string, callback: (data: any) => void) => () => void;
      };
    };
  }
}
