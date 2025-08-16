import { $, component$, useSignal, QRL, useContext } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import XCircleIcon from '~/components/icons/XCircleIcon';
import { loginMutation } from '~/providers/shop/account/account';
import { secureAuthSubmission } from '~/utils/secure-api';
import { getActiveCustomerQuery } from '~/providers/shop/customer/customer';
import { APP_STATE } from '~/constants';
import { ActiveCustomer } from '~/types';

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
    }
  });

  const signup = $(async () => {
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
    
    try {
      const result = await secureAuthSubmission({
        email: signUpEmail.value,
        password: signUpPassword.value,
        firstName: firstName.value,
        lastName: lastName.value,
      }, false, { skipRecaptcha: true });

      // Parse the response - handle the actual response structure
      const response = await result.json();
      const registrationResult = response?.data?.registerCustomerAccount;

      if (registrationResult?.success === true) {
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

        if (registrationResult?.errorCode === 'EMAIL_ADDRESS_CONFLICT_ERROR' ||
          registrationResult?.message?.toLowerCase().includes('email') ||
          registrationResult?.message?.toLowerCase().includes('already') ||
          registrationResult?.message?.toLowerCase().includes('exists')) {
          errorMessage = 'An account with this email address already exists';
        } else if (registrationResult?.message?.toLowerCase().includes('password')) {
          errorMessage = 'Password does not meet requirements';
        } else if (registrationResult?.message?.toLowerCase().includes('validation')) {
          errorMessage = 'Please check your information and try again';
        } else if (registrationResult?.message) {
          errorMessage = registrationResult.message;
        }

        signUpError.value = errorMessage;
      }
    } catch (error) {
      console.error('[LoginModal] Registration error:', error);
      signUpError.value = 'An error occurred during registration. Please try again.';
    }
  });

  if (!isOpen) return null;

  return (
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick$={$(async (e) => {
        if (e.target === e.currentTarget) {
          closeModal();
          await onClose$();
        }
      })}
    >
      <div class="relative w-full max-w-4xl mx-4">
        <div class="bg-white rounded-lg shadow-xl overflow-hidden animate-scale-in">
          {/* Header */}
          <div class="border-b border-gray-200 px-6 py-4">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-gray-900">
                Sign In to Your Account
              </h2>
              <button
                onClick$={$(async () => {
                  closeModal();
                  await onClose$();
                })}
                class="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                aria-label="Close modal"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div class="px-6 py-6">
            {/* Mobile tabs */}
            <div class="md:hidden mb-6">
              <div class="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick$={() => activeTab.value = 'signin'}
                  class={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    activeTab.value === 'signin'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick$={() => activeTab.value = 'signup'}
                  class={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    activeTab.value === 'signup'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Desktop side-by-side layout / Mobile tab content */}
            <div class="md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 md:items-start md:justify-center">
              {/* Sign In Form */}
              <div class={`${activeTab.value === 'signin' ? 'block' : 'hidden'} md:block`}>
                <div class="bg-[#f5f5f5] rounded-2xl p-8 shadow-sm">
                  <div class="text-center mb-8 md:block hidden">
                    <h2 class="text-2xl font-bold text-gray-900">Sign In</h2>
                    <p class="mt-2 text-sm text-gray-600">Access your account</p>
                  </div>

                  <form onSubmit$={$(async (e) => {
                    e.preventDefault();
                    await login();
                  })}>
                    <div class="space-y-6">
                      <div>
                        <input
                          type="email"
                          bind:value={signInEmail}
                          class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
                          placeholder="Enter your email"
                          required
                        />
                      </div>

                      <div>
                        <input
                          type="password"
                          bind:value={signInPassword}
                          class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
                          placeholder="Enter your password"
                          required
                        />
                      </div>

                    <div class="flex items-center justify-between">
                      <div class="flex items-center">
                        <input
                          type="checkbox"
                          checked
                          onChange$={(_, el) => (rememberMe.value = el.checked)}
                          class="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded-sm"
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
                          class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8a6d4a] hover:bg-[#4F3B26] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#8a6d4a] transition-colors cursor-pointer"
                        >
                          Sign In
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* Vertical divider for desktop */}
              <div class="hidden md:flex md:justify-center md:items-center md:h-full">
                <div class="flex flex-col items-center justify-center h-96">
                  <div class="flex-1 w-px bg-gray-300"></div>
                  <div class="px-4 py-2 bg-gray-200 rounded-full">
                    <span class="text-sm font-medium text-gray-600">OR</span>
                  </div>
                  <div class="flex-1 w-px bg-gray-300"></div>
                </div>
              </div>

              {/* Sign Up Form */}
              <div class={`${activeTab.value === 'signup' ? 'block' : 'hidden'} md:block`}>
                <div class="bg-[#f5f5f5] rounded-2xl p-8 shadow-sm">
                  <div class="text-center mb-8 md:block hidden">
                    <h2 class="text-2xl font-bold text-gray-900">Create Account</h2>
                    <p class="mt-2 text-sm text-gray-600">Join our community</p>
                  </div>

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
                      </div>
                    </div>
                  ) : (
                    <form onSubmit$={$(async (e) => {
                      e.preventDefault();
                      await signup();
                    })}>
                      <div class="space-y-6">
                        <div>
                          <input
                            type="email"
                            bind:value={signUpEmail}
                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
                            placeholder="Enter your email"
                            required
                          />
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                          <div>
                            <input
                              type="text"
                              bind:value={firstName}
                              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
                              placeholder="First name"
                              required
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              bind:value={lastName}
                              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
                              placeholder="Last name"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="password"
                            bind:value={signUpPassword}
                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
                            placeholder="Create a password"
                            required
                          />
                        </div>

                        <div>
                          <input
                            type="password"
                            bind:value={confirmPassword}
                            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
                            placeholder="Confirm your password"
                            required
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
                            class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8a6d4a] hover:bg-[#4F3B26] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#8a6d4a] transition-colors cursor-pointer"
                          >
                            Create Account
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});