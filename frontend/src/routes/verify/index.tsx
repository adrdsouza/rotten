import { component$, useSignal, useVisibleTask$ } from '@qwik.dev/core';
import { useLocation } from '@qwik.dev/router';
import XCircleIcon from '~/components/icons/XCircleIcon';
import { verifyCustomerAccountMutation } from '~/providers/shop/account/account';

export default component$(() => {
	const error = useSignal('');
	const location = useLocation();

	useVisibleTask$(async () => {
		// Extract token from URL parameters
		const urlParams = new URLSearchParams(location.url.search);
		const token = urlParams.get('token');

		if (!token) {
			error.value = 'No verification token found in URL';
			return;
		}

		try {
			const { verifyCustomerAccount } = await verifyCustomerAccountMutation(token);

			if (verifyCustomerAccount.__typename !== 'CurrentUser') {
				error.value = verifyCustomerAccount.message;
			} else {
				// Force a page reload to ensure the auth cookie is properly set for SSR
				window.location.href = '/account';
			}
		} catch (err) {
			error.value = 'An error occurred during verification. Please try again.';
			console.error('Verification error:', err);
		}
	});

	return (
		<div class="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div class="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10">
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
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
});
