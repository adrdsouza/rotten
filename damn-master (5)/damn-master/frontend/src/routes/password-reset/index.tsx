import { $, component$, useSignal } from '@qwik.dev/core';
import { useLocation, useNavigate } from '@qwik.dev/router';
import XCircleIcon from '~/components/icons/XCircleIcon';
import { resetPasswordMutation } from '~/providers/shop/account/account';
import { createSEOHead } from '~/utils/seo';

export const head = () => {
	return createSEOHead({
		title: 'Reset Password',
		description: 'Set a new password for your Damned Designs account.',
		noindex: true,
	});
};

export default component$(() => {
	const password = useSignal('');
	const error = useSignal('');
	const debugMessage = useSignal('');
	const isLoading = useSignal(false);
	const loadingMessage = useSignal('Resetting...');
	const location = useLocation();
	const navigate = useNavigate();

	const reset = $(async () => {
		isLoading.value = true;
		error.value = ''; // Clear any previous errors
		debugMessage.value = 'Button clicked, starting reset...';

		try {
			const token = location.url.href.split('=')[1];
			debugMessage.value = `Token: ${token?.substring(0, 10)}...`;

			loadingMessage.value = 'Verifying token...';

			// Start navigation optimistically while API call is in progress
			const resetPromise = resetPasswordMutation(token, password.value);

			// Update loading message after a brief delay
			setTimeout(() => {
				if (isLoading.value) {
					loadingMessage.value = 'Updating password...';
				}
			}, 500);

			// Add a small delay to show loading state briefly
			const [resetPassword] = await Promise.all([
				resetPromise,
				new Promise(resolve => setTimeout(resolve, 300)) // Minimum 300ms loading
			]);

			debugMessage.value = `Response: ${resetPassword.__typename}`;

			if (resetPassword.__typename !== 'CurrentUser') {
				// Only stop loading on error
				error.value = resetPassword.message;
				isLoading.value = false;
			} else {
				// Keep loading state during navigation
				loadingMessage.value = 'Success! Redirecting...';
				navigate('/account');
			}
		} catch (err) {
			debugMessage.value = `Error: ${err}`;
			error.value = 'An error occurred while resetting your password. Please try again.';
			isLoading.value = false; // Only stop loading on error
		}
	});

	return (
		<div class="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
					<h2 class="mt-6 text-center text-3xl text-gray-900">Reset password</h2>
					<p class="mt-2 text-center text-sm text-gray-600">Choose a new password</p>

							<div>
								<div class="mt-1 mb-8">
									<input
										type="password"
										value={password.value}
										required
										onInput$={(_, el) => (password.value = el.value)}
										onKeyUp$={(ev, el) => {
											error.value = '';
											if (ev.key === 'Enter' && !!el.value) {
												reset();
											}
										}}
										class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
									/>
								</div>
							</div>
							{error.value !== '' && (
								<div class="rounded-md bg-red-50 p-4 mb-8">
									<div class="flex">
										<div class="flex-shrink-0">
											<XCircleIcon />
										</div>
										<div class="ml-3">
											<h3 class="text-sm font-medium text-red-800">
												We ran into a problem verifying your account!
											</h3>
											<p class="text-sm text-red-700 mt-2">{error.value}</p>
										</div>
									</div>
								</div>
							)}
							<div>
								<button
									class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#d42838] hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
									onClick$={reset}
									disabled={isLoading.value}
								>
									{isLoading.value ? (
										<>
											<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											{loadingMessage.value}
										</>
									) : (
										'Reset password'
									)}
								</button>
							</div>
				</div>
			</div>
		</div>
	);
});