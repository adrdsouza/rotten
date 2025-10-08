import { component$, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import XCircleIcon from '~/components/icons/XCircleIcon';
import { verifyCustomerAccountMutation } from '~/providers/shop/account/account';

export default component$(() => {
	const error = useSignal('');
	const loading = useSignal(true);
	const success = useSignal(false);
	const location = useLocation();

	useVisibleTask$(async () => {
		// Extract token from URL parameters
		const urlParams = new URLSearchParams(location.url.search);
		const token = urlParams.get('token');

		if (!token) {
			error.value = 'No verification token found in URL. Please check your email and click the verification link again.';
			loading.value = false;
			return;
		}

		try {
			const { verifyCustomerAccount } = await verifyCustomerAccountMutation(token);

			if (verifyCustomerAccount.__typename !== 'CurrentUser') {
				error.value = verifyCustomerAccount.message || 'Verification failed. The token may be invalid or expired.';
				loading.value = false;
			} else {
				// Show success message before redirect
				success.value = true;
				loading.value = false;
				
				// Delay redirect to show success message
				setTimeout(() => {
					// Force a page reload to ensure the auth cookie is properly set for SSR
					window.location.href = '/account';
				}, 2000);
			}
		} catch (err) {
			error.value = 'An error occurred during verification. Please try again or contact support if the problem persists.';
			loading.value = false;
			console.error('Verification error:', err);
		}
	});

	return (
		<div class="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div class="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10">
					{loading.value && (
						<div class="text-center">
							<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">Verifying your account...</h3>
							<p class="text-sm text-gray-600">Please wait while we verify your email address.</p>
						</div>
					)}
					
					{success.value && (
						<div class="text-center">
							<div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
								<svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<h3 class="text-lg font-medium text-gray-900 mb-2">Email verified successfully!</h3>
							<p class="text-sm text-gray-600">Redirecting you to your account...</p>
						</div>
					)}
					
					{error.value !== '' && (
						<div class="rounded-md bg-red-50 p-4">
							<div class="flex">
								<div class="shrink-0">
									<XCircleIcon />
								</div>
								<div class="ml-3">
									<h3 class="text-sm font-medium text-red-800">
										We ran into a problem verifying your account!
									</h3>
									<p class="text-sm text-red-700 mt-2">{error.value}</p>
									<div class="mt-4">
										<a href="/account/register" class="text-sm font-medium text-red-800 hover:text-red-700 underline">
											Try registering again
										</a>
										<span class="text-sm text-red-700 mx-2">or</span>
										<a href="/" class="text-sm font-medium text-red-800 hover:text-red-700 underline">
											Return to homepage
										</a>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});
