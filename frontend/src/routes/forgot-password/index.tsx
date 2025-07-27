import { $, component$, useSignal } from '@qwik.dev/core';
import XCircleIcon from '~/components/icons/XCircleIcon';
import { requestPasswordResetMutation } from '~/providers/shop/account/account';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
	const email = useSignal('');
	const error = useSignal('');
	const success = useSignal(false);
	const reset = $(async () => {
		const requestPasswordReset = await requestPasswordResetMutation(email.value);
		if (requestPasswordReset?.__typename === 'Success') {
			success.value = true;
		} else {
			error.value = requestPasswordReset?.message ?? 'Reset password error';
		}
	});
	return (
		<div class="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
			<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
				<div class="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10">
					{success.value && (
						<div class="mb-6 bg-yellow-50 border border-yellow-400 text-yellow-800 rounded-sm p-4 text-center text-sm">
							<p>Password reset email sent to {email.value}</p>
						</div>
					)}
					<div class="space-y-6">
						<div>
							<label class="block text-sm font-medium text-gray-700">Email</label>
							<div class="mt-1">
								<input
									type="email"
									value={email.value}
									required
									onInput$={(_, el) => (email.value = el.value)}
									onKeyUp$={(ev, el) => {
										error.value = '';
										if (ev.key === 'Enter' && !!el.value) {
											reset();
										}
									}}
									class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs placeholder-gray-400 focus:outline-hidden focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
								/>
							</div>
						</div>						{error.value !== '' && (
							<div class="rounded-md bg-red-50 p-4">
								<div class="flex">
									<div class="shrink-0">
										<XCircleIcon />
									</div>
									<div class="ml-3">
										<p class="text-sm text-red-700">{error.value}</p>
									</div>
								</div>
							</div>
						)}
						<div>
							<button
								class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#eee9d4] hover:bg-[#4F3B26] focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#eee9d4] transition-colors cursor-pointer"
								onClick$={reset}
							>
								Reset password
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
});

export const head = () => {
	return createSEOHead({
		title: 'Forgot Password',
		description: 'Reset your Rotten Hand account password.',
		noindex: true,
	});
};
