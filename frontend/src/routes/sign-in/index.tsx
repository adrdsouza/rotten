import { $, component$, useSignal } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import XCircleIcon from '~/components/icons/XCircleIcon';
import { isEnvVariableEnabled } from '~/utils';
import { loginMutation } from '~/providers/shop/account/account';
import { secureAuthSubmission } from '~/utils/secure-api';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
	const navigate = useNavigate();
	
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
	const successSignal = useSignal(false);	const login = $(async () => {
		// Client-side validation - prevent API call if required fields are empty
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

		signInError.value = ''; // Clear any previous errors

		console.log('[SignIn] Attempting direct GraphQL login with:', {
			email: signInEmail.value,
			password: signInPassword.value ? '******' : '',
			rememberMe: rememberMe.value
		});		try {
			const { login } = await loginMutation(
				signInEmail.value,
				signInPassword.value,
				rememberMe.value
			);
			
			console.log('[SignIn] Backend response:', login);
			
			if (login.__typename === 'CurrentUser') {
				navigate('/account');
			} else {
				// Enhanced error detection for better user messages
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
				} else {
					console.error('[SignIn] Unexpected login response:', login);
					errorMessage = 'Unexpected response from server. Please try again.';
				}
				
				signInError.value = errorMessage;
				console.error('[SignIn] Login failed:', errorMessage);
			}
		} catch (err: any) {
			console.error('[SignIn] Login exception caught:', err);
			console.error('[SignIn] Error stack:', err?.stack);
			signInError.value = 'Unexpected error occurred.';
		}
	});
	const registerCustomer = $(async (): Promise<void> => {
		// Clear previous error
		signUpError.value = '';
		
		// Client-side validation - prevent API call if required fields are empty
		if (!signUpEmail.value.trim()) {
			signUpError.value = 'Email address is required';
			return;
		}
		
		if (!firstName.value.trim()) {
			signUpError.value = 'First name is required';
			return;
		}
		
		if (!lastName.value.trim()) {
			signUpError.value = 'Last name is required';
			return;
		}
		
		if (!signUpPassword.value.trim()) {
			signUpError.value = 'Password is required';
			return;
		}
		
		if (!confirmPassword.value.trim()) {
			signUpError.value = 'Please confirm your password';
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
			return;		}
		
		successSignal.value = false;		try {
			const result = await secureAuthSubmission({
				email: signUpEmail.value,
				password: signUpPassword.value,
				firstName: firstName.value,
				lastName: lastName.value,
			}, false, { skipRecaptcha: true }); // Disable reCAPTCHA
			
			// Parse the response - handle the actual response structure
			const response = await result.json();
			console.log('[SignUp] Full response:', response);
			
			// The actual response structure is { data: { registerCustomerAccount: { success: true } } }
			const registrationResult = response?.data?.registerCustomerAccount;
			console.log('[SignUp] Registration account result:', registrationResult);
			
			if (registrationResult?.success === true) {
				successSignal.value = true;
			} else {// Enhanced error detection for better user messages
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
				
				console.error('[SignUp] Registration failed:', errorMessage);
				signUpError.value = errorMessage;
			}
		} catch (err) {
			console.error('[SignUp] Registration exception:', err);
			signUpError.value = 'Unexpected error occurred during registration.';
		}
	});
	return (
		<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div class="max-w-5xl mx-auto">
				{/* Mobile tabs */}
				<div class="md:hidden mb-8">
					<div class="flex bg-gray-200 rounded-lg p-1">
						<button
							onClick$={() => activeTab.value = 'signin'}
							class={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors cursor-pointer ${
								activeTab.value === 'signin'
									? 'bg-white text-gray-900 shadow-sm'
									: 'text-gray-500 hover:text-gray-700'
							}`}
						>
							Sign In
						</button>
						<button
							onClick$={() => activeTab.value = 'signup'}
							class={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors cursor-pointer ${
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
				<div class="md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 md:items-center md:justify-center">
					{/* Sign In Form */}
					<div class={`${activeTab.value === 'signin' ? 'block' : 'hidden'} md:block`}>
						<div class="bg-[#f5f5f5] rounded-2xl p-8 shadow-sm">
							<div class="text-center mb-8">
								<h2 class="text-2xl font-bold text-gray-900">Sign In</h2>
								<p class="mt-2 text-sm text-gray-600">Access your account</p>
							</div>

							<div class="space-y-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Email address</label>
									<div class="mt-1">
										<input
											type="email"
											autoComplete="email"
											value={signInEmail.value}
											required
											onInput$={(_, el) => (signInEmail.value = el.value)}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
										/>
									</div>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700">Password</label>
									<div class="mt-1">
										<input
											type="password"
											value={signInPassword.value}
											required
											onInput$={(_, el) => (signInPassword.value = el.value)}
											onKeyUp$={(ev, el) => {
												if (ev.key === 'Enter' && !!el.value) {
													login();
												}
											}}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
										/>
									</div>
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
											onClick$={() => navigate('/forgot-password')}
											class="font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
										>
											Forgot password?
										</button>
									</div>
								</div>								{signInError.value !== '' && (
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
										class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#937237] hover:bg-[#CD9E34] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#937237] transition-colors cursor-pointer"
										onClick$={login}
									>
										Sign In
									</button>
								</div>
							</div>
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
							<div class="text-center mb-8">
								<h2 class="text-2xl font-bold text-gray-900">Sign Up</h2>
								<p class="mt-2 text-sm text-gray-600">Create a new account</p>
							</div>

							{successSignal.value && (
								<div class="mb-6 bg-green-50 border border-green-400 text-green-800 rounded-md p-4 text-center text-sm">
									<p>
										Account registration successful! We sent email verification to {signUpEmail.value}, you
										must verify before logging in.
									</p>
								</div>
							)}

							{isEnvVariableEnabled('VITE_IS_READONLY_INSTANCE') && (
								<div class="mb-6 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-md p-4 text-center text-sm">
									<p>
										Account registration is not supported by the demo Vendure instance. In order to use
										it, please connect to your own local / production instance.
									</p>
								</div>
							)}

							<div class="space-y-6">
								<div>
									<label class="block text-sm font-medium text-gray-700">Email address</label>
									<div class="mt-1">
										<input
											type="email"
											autoComplete="email"
											value={signUpEmail.value}
											required
											onInput$={(_, el) => (signUpEmail.value = el.value)}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
										/>
									</div>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div>
										<label class="block text-sm font-medium text-gray-700">First name</label>
										<div class="mt-1">
											<input
												type="text"
												value={firstName.value}
												required
												onInput$={(_, el) => (firstName.value = el.value)}
												class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
											/>
										</div>
									</div>

									<div>
										<label class="block text-sm font-medium text-gray-700">Last name</label>
										<div class="mt-1">
											<input
												type="text"
												value={lastName.value}
												required
												onInput$={(_, el) => (lastName.value = el.value)}
												class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
											/>
										</div>
									</div>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700">Password</label>
									<div class="mt-1">
										<input
											type="password"
											value={signUpPassword.value}
											required
											onInput$={(_, el) => (signUpPassword.value = el.value)}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
										/>
									</div>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700">Confirm Password</label>
									<div class="mt-1">
										<input
											type="password"
											value={confirmPassword.value}
											required
											onInput$={(_, el) => (confirmPassword.value = el.value)}
											class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-gray-500 focus:border-gray-500 sm:text-sm bg-white"
										/>
									</div>
								</div>								{signUpError.value !== '' && (
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
										class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#937237] hover:bg-[#CD9E34] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#937237] transition-colors cursor-pointer"
										onClick$={registerCustomer}
									>
										Sign Up
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
});

export const head = () => {
	return createSEOHead({
		title: 'Sign In | Sign Up',
		description: 'Sign in to your existing account or create a new Rotten Hand account to shop, track orders, and manage your profile.',
		noindex: true,
	});
};
