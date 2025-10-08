import { $, component$, useSignal, QRL, useContext, useVisibleTask$ } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import XCircleIcon from '~/components/icons/XCircleIcon';
import { loginMutation, registerCustomerAccountMutation } from '~/providers/shop/account/account';
import { getActiveCustomerQuery } from '~/providers/shop/customer/customer';
import { APP_STATE } from '~/constants';
import { ActiveCustomer } from '~/types';
import { LocalAddressService } from '~/services/LocalAddressService';
import { clearCustomerCacheAfterMutation } from '~/providers/shop/customer/customer';

export interface LoginModalProps {
  isOpen: boolean;
  onClose$: QRL<() => void>;
  onLoginSuccess$?: QRL<() => void>;
}

export default component$<LoginModalProps>(({
  isOpen,
  onClose$,
  onLoginSuccess$
}) => {
  const navigate = useNavigate();
  const appState = useContext(APP_STATE);

  // Tab state for mobile
  const activeTab = useSignal<'signin' | 'signup'>('signin');

  // Sign in form state
  const signInEmail = useSignal('');
  const signInPassword = useSignal('');
  const rememberMe = useSignal(true);
  const signInError = useSignal('');

  // Sign up form state
  const signUpEmail = useSignal('');
  const firstName = useSignal('');
  const lastName = useSignal('');
  const signUpPassword = useSignal('');
  const confirmPassword = useSignal('');
  const signUpError = useSignal('');
  const successSignal = useSignal(false);

  // Loading states
  const isSigningIn = useSignal(false);
  const isSigningUp = useSignal(false);

  // Refs for auto-focus
  const signInEmailRef = useSignal<HTMLInputElement>();
  const signUpEmailRef = useSignal<HTMLInputElement>();

  // Auto-focus when modal opens or tab changes
  useVisibleTask$(({ track, cleanup }) => {
    track(() => isOpen);
    track(() => activeTab.value);

    if (isOpen) {
      const focusInput = () => {
        const input = activeTab.value === 'signin' ? signInEmailRef.value : signUpEmailRef.value;
        if (input) {
          input.focus();
          input.select();
        }
      };

      // Try immediately and after short delays to handle animation timing
      focusInput();
      setTimeout(focusInput, 50);
      setTimeout(focusInput, 200);

      // Close on Escape key
      const onKeyDown = async (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal();
          await onClose$();
        }
      };
      window.addEventListener('keydown', onKeyDown);
      cleanup(() => window.removeEventListener('keydown', onKeyDown));
    }
  });


  const closeModal = $(() => {
    // Reset form state
    signInEmail.value = '';
    signInPassword.value = '';
    signInError.value = '';
    signUpEmail.value = '';
    firstName.value = '';
    lastName.value = '';
    signUpPassword.value = '';
    confirmPassword.value = '';
    signUpError.value = '';
    successSignal.value = false;
    activeTab.value = 'signin';
  });

  const login = $(async () => {
    if (isSigningIn.value) return; // Prevent double submission

    // Client-side validation
    if (!signInEmail.value.trim() || !signInPassword.value.trim()) {
      signInError.value = 'Please fill in both email and password';
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signInEmail.value.trim())) {
      signInError.value = 'Please enter a valid email address';
      return;
    }

    signInError.value = '';
    isSigningIn.value = true;

    try {
      const { login } = await loginMutation(
        signInEmail.value,
        signInPassword.value,
        rememberMe.value
      );

      if (login.__typename === 'CurrentUser') {
        // Update app state with new customer data
        try {
          const customerData = await getActiveCustomerQuery();
          if (customerData) {
            appState.customer = {
              title: customerData.title ?? '',
              firstName: customerData.firstName,
              id: customerData.id,
              lastName: customerData.lastName,
              emailAddress: customerData.emailAddress,
              phoneNumber: customerData.phoneNumber ?? '',
            } as ActiveCustomer;

            // Invalidate any cached customer/address queries and eagerly sync address book
            try {
              clearCustomerCacheAfterMutation();
              await LocalAddressService.syncFromVendure(customerData.id);
              const addresses = LocalAddressService.getAddresses();
              appState.addressBook = addresses;

              // Prefill default shipping address if empty
              if (addresses.length > 0 && !appState.shippingAddress.streetLine1) {
                const defaultShipping = addresses.find(a => a.defaultShippingAddress) || addresses[0];
                if (defaultShipping) {
                  appState.shippingAddress = {
                    id: defaultShipping.id,
                    fullName: defaultShipping.fullName,
                    streetLine1: defaultShipping.streetLine1,
                    streetLine2: defaultShipping.streetLine2 || '',
                    city: defaultShipping.city,
                    province: defaultShipping.province,
                    postalCode: defaultShipping.postalCode,
                    countryCode: defaultShipping.countryCode,
                    phoneNumber: defaultShipping.phoneNumber || '',
                    company: defaultShipping.company || '',
                  };
                }
              }
            } catch (addrErr) {
              console.warn('[LoginModal] Address sync after login failed:', addrErr);
            }
          }
        } catch (error) {
          console.error('Failed to update customer data:', error);
        }

        // Close modal
        closeModal();
        await onClose$();

        // Handle custom success callback if provided
        if (onLoginSuccess$) {
          await onLoginSuccess$();
        }

        // No automatic redirects - just stay on current page
        // Customer data is now updated and modal is closed
      } else {
        // Enhanced error detection
        let errorMessage = 'Login failed';

        if (login.errorCode === 'INVALID_CREDENTIALS_ERROR' ||
          login.message?.toLowerCase().includes('invalid') ||
          login.message?.toLowerCase().includes('password') ||
          login.message?.toLowerCase().includes('credentials')) {
          errorMessage = 'Invalid email or password';
        } else if (login.message?.toLowerCase().includes('verify') ||
                   login.message?.toLowerCase().includes('verification')) {
          errorMessage = 'Please verify your email address before signing in';
        } else if (login.message) {
          errorMessage = login.message;
        }

        signInError.value = errorMessage;
      }
    } catch (error) {
      console.error('[LoginModal] Login error:', error);
      signInError.value = 'An error occurred during login. Please try again.';
    } finally {
      isSigningIn.value = false;
    }
  });

  const signup = $(async () => {
    if (isSigningUp.value) return; // Prevent double submission

    // Client-side validation
    if (!signUpEmail.value.trim() || !firstName.value.trim() ||
        !lastName.value.trim() || !signUpPassword.value.trim()) {
      signUpError.value = 'Please fill in all required fields';
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpEmail.value.trim())) {
      signUpError.value = 'Please enter a valid email address';
      return;
    }

    // Password validation
    if (signUpPassword.value.length < 6) {
      signUpError.value = 'Password must be at least 6 characters long';
      return;
    }

    if (signUpPassword.value !== confirmPassword.value) {
      signUpError.value = 'Passwords do not match';
      return;
    }

    successSignal.value = false;
    isSigningUp.value = true;

    try {
      const result = await registerCustomerAccountMutation({
        input: {
          emailAddress: signUpEmail.value,
          password: signUpPassword.value,
          firstName: firstName.value,
          lastName: lastName.value,
        }
      });

      // Result is a typed GraphQL response
      const registrationResult = result?.registerCustomerAccount;

      if (registrationResult?.__typename === 'Success' && registrationResult.success === true) {
        successSignal.value = true;
        signUpError.value = '';

        // Clear form
        signUpEmail.value = '';
        firstName.value = '';
        lastName.value = '';
        signUpPassword.value = '';
        confirmPassword.value = '';

        // No automatic action - customer can manually close modal or switch tabs
      } else {
        // Enhanced error detection for better user messages
        let errorMessage = 'Registration failed';

        if (registrationResult && registrationResult.__typename !== 'Success') {
          const msg = registrationResult.message?.toLowerCase() || '';
          if (registrationResult.errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR' ||
              msg.includes('email') ||
              msg.includes('already') ||
              msg.includes('exists')) {
            errorMessage = 'An account with this email address already exists';
          } else if (msg.includes('password')) {
            errorMessage = 'Password does not meet requirements';
          } else if (msg.includes('validation')) {
            errorMessage = 'Please check your information and try again';
          } else if (registrationResult.message) {
            errorMessage = registrationResult.message;
          }
        }

        signUpError.value = errorMessage;
      }
    } catch (error) {
      console.error('[LoginModal] Registration error:', error);
      signUpError.value = 'An error occurred during registration. Please try again.';
    } finally {
      isSigningUp.value = false;
    }
  });

  if (!isOpen) return null;

  return (
    <div
      class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 animate-fade-in"
      onClick$={$(async (e: MouseEvent) => {
        if (e.target === e.currentTarget) {
          closeModal();
          await onClose$();
        }
      })}
    >
      <div class="relative w-full max-w-md mx-4">
        <div class="bg-white rounded-lg border border-gray-200 shadow-none overflow-hidden">
          {/* Tabs */}
          <div class="px-6 pt-6 pb-0">
            <div class="flex bg-gray-100 rounded-md p-1 mb-6 border border-gray-200">
              <button
                onClick$={() => {
                  activeTab.value = 'signin';
                  signInError.value = '';
                  signUpError.value = '';
                }}
                class={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                  activeTab.value === 'signin'
                    ? 'bg-[#d42838] text-white shadow-none'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Sign In
              </button>
              <button
                onClick$={() => {
                  activeTab.value = 'signup';
                  signInError.value = '';
                  signUpError.value = '';
                  successSignal.value = false;
                }}
                class={`flex-1 py-3 px-4 text-sm font-medium rounded-md transition-all duration-200 cursor-pointer ${
                  activeTab.value === 'signup'
                    ? 'bg-[#d42838] text-white shadow-none'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Content */}
          <div class="px-6 pb-6">
            {/* Sign In Form */}


            {activeTab.value === 'signin' && (
              <form onSubmit$={$(async (e) => {
                e.preventDefault();
                await login();
              })}>
                <div class="space-y-4 font-body">
                  <div>
                    <input
                      ref={signInEmailRef}
                      type="email"
                      bind:value={signInEmail}
                      class="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-hidden focus:ring-0 focus:border-brand-red sm:text-base bg-white"
                      placeholder="Enter your email"
                      required
                      disabled={isSigningIn.value}
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      bind:value={signInPassword}
                      class="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-hidden focus:ring-0 focus:border-brand-red sm:text-base bg-white"
                      placeholder="Enter your password"
                      required
                      disabled={isSigningIn.value}
                    />
                  </div>

                  <div class="flex items-center justify-between">
                    <div class="flex items-center">
                      <input
                        type="checkbox"
                        checked
                        onChange$={(_, el) => (rememberMe.value = el.checked)}
                        class="h-4 w-4 text-brand-red focus:ring-brand-red border-gray-300 rounded-sm"
                        disabled={isSigningIn.value}
                      />
                      <label class="ml-2 block text-sm text-gray-900">Remember me</label>
                    </div>

                    <div class="text-sm">
                      <button
                        type="button"
                        onClick$={$(async () => {
                          closeModal();
                          await onClose$();
                          navigate('/forgot-password');
                        })}
                        class="font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
                        disabled={isSigningIn.value}
                      >
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  {signInError.value !== '' && (
                    <div class="rounded-md bg-red-50 p-4">
                      <div class="flex">
                        <div class="shrink-0">
                          <XCircleIcon />
                        </div>
                        <div class="ml-3">
                          <p class="text-sm text-red-700">{signInError.value}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={isSigningIn.value}
                      class="btn-primary"
                    >
                      {isSigningIn.value ? (
                        <>
                          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing In...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </div>

                  {/* Close link */}
                  <div class="text-center mt-4">
                    <button
                      type="button"
                      onClick$={$(async () => {
                        closeModal();
                        await onClose$();
                      })}
                      class="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                      disabled={isSigningIn.value}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Sign Up Form */}


            {activeTab.value === 'signup' && (
              <>
                {successSignal.value ? (
                  <div class="text-center py-8">
                    <div class="bg-green-50 border border-green-200 rounded-lg p-6">
                      <svg class="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <h3 class="text-lg font-semibold text-gray-900 mb-2">Account Created!</h3>
                      <p class="text-gray-600 mb-4">
                        Please check your email to verify your account. You can now use the sign in form to sign in.
                      </p>
                      <button
                        onClick$={() => {
                          activeTab.value = 'signin';
                          successSignal.value = false;
                        }}
                        class="text-sm font-medium text-brand-red hover:text-black cursor-pointer"
                      >
                        Go to Sign In →
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit$={$(async (e) => {
                    e.preventDefault();
                    await signup();
                  })}>
                    <div class="space-y-4">
                      <div>
                        <input
                          ref={signUpEmailRef}
                          type="email"
                          bind:value={signUpEmail}
                          class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-hidden focus:ring-0 focus:border-brand-red sm:text-base bg-white"
                          placeholder="Enter your email"
                          required
                          disabled={isSigningUp.value}
                        />
                      </div>

                      <div class="grid grid-cols-2 gap-4">
                        <div>
                          <input
                            type="text"
                            bind:value={firstName}
                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red sm:text-sm bg-white"
                            placeholder="First name"
                            required
                            disabled={isSigningUp.value}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            bind:value={lastName}
                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-brand-red sm:text-sm bg-white"
                            placeholder="Last name"
                            required
                            disabled={isSigningUp.value}
                          />
                        </div>
                      </div>

                      <div>
                        <input
                          type="password"
                          bind:value={signUpPassword}
                          class="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-hidden focus:ring-0 focus:border-brand-red sm:text-base bg-white"
                          placeholder="Create a password"
                          required
                          disabled={isSigningUp.value}
                        />
                      </div>

                      <div>
                        <input
                          type="password"
                          bind:value={confirmPassword}
                          class="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-hidden focus:ring-0 focus:border-brand-red sm:text-base bg-white"
                          placeholder="Confirm your password"
                          required
                          disabled={isSigningUp.value}
                        />
                      </div>

                      {signUpError.value !== '' && (
                        <div class="rounded-md bg-red-50 p-4">
                          <div class="flex">
                            <div class="shrink-0">
                              <XCircleIcon />
                            </div>
                            <div class="ml-3">
                              <p class="text-sm text-red-700">{signUpError.value}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <button
                          type="submit"
                          disabled={isSigningUp.value}
                          class="btn-primary"
                        >
                          {isSigningUp.value ? (
                            <>
                              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Creating Account...
                            </>
                          ) : (
                            'Create Account'
                          )}
                        </button>
                      </div>

                      {/* Close link */}
                      <div class="text-center mt-4">
                        <button
                          type="button"
                          onClick$={$(async () => {
                            closeModal();
                            await onClose$();
                          })}
                          class="text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                          disabled={isSigningUp.value}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
