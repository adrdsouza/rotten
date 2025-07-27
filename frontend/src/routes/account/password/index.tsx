import { $, component$, useContext, useSignal } from '@qwik.dev/core';
import { useNavigate } from '@qwik.dev/router';
import { AccountNav } from '~/components/account/AccountNav';
import { HighlightedButton } from '~/components/buttons/HighlightedButton';
import { ErrorMessage } from '~/components/error-message/ErrorMessage';
import Success from '~/components/success/Success';
import CheckIcon from '~/components/icons/CheckIcon';
import EyeIcon from '~/components/icons/EyeIcon';
import EyeSlashIcon from '~/components/icons/EyeSlashIcon';
import { APP_STATE } from '~/constants';
import { updateCustomerPasswordMutation } from '~/providers/shop/customer/customer';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
	const navigate = useNavigate();
	const appState = useContext(APP_STATE);
	const currentPassword = useSignal('');
	const newPassword = useSignal('');
	const confirmPassword = useSignal('');
	const errorMessage = useSignal('');
	const successMessage = useSignal('');
	const showPasswordAsTextSignal = useSignal(false);
	const updatePassword = $(async () => {
		errorMessage.value = '';
		successMessage.value = '';
		
		// Client-side validation
		if (!currentPassword.value.trim()) {
			errorMessage.value = 'Current password is required!';
			return;
		}
		
		if (!newPassword.value.trim()) {
			errorMessage.value = 'New password is required!';
			return;
		}
		
		if (newPassword.value.length < 6) {
			errorMessage.value = 'New password must be at least 6 characters long!';
			return;
		}
		
		if (newPassword.value !== confirmPassword.value) {
			errorMessage.value = 'Confirm password does not match!';
			return;
		}
		
		// API call
		const updateCustomerPassword = await updateCustomerPasswordMutation(
			currentPassword.value,
			newPassword.value
		);

		switch (updateCustomerPassword.__typename) {
			case 'PasswordValidationError':
				errorMessage.value = 'Please set a stronger new password!';
				break;
			case 'InvalidCredentialsError':
				errorMessage.value = 'Current password does not match!';
				break;
			case 'NativeAuthStrategyError':
				errorMessage.value = 'Login method mismatch!';
				break;
			default:
				successMessage.value = 'Password updated successfully!';
				// Clear form fields
				currentPassword.value = '';
				newPassword.value = '';
				confirmPassword.value = '';
				// Optionally redirect after a delay
				setTimeout(() => navigate('/account'), 2000);
				break;
		}
	});

	const togglePasswordFields = $(() => {
		showPasswordAsTextSignal.value = !showPasswordAsTextSignal.value;
	});	return appState.customer ? (
		<div class="min-h-screen bg-gray-50">
			<div class="max-w-6xl mx-auto px-4 py-8">
				<AccountNav />
				<div class="mt-8 max-w-md mx-auto">
					<div class="bg-[#f5f5f5] rounded-xl shadow-sm border border-gray-200 overflow-hidden">
						{/* Header */}
						<div class="p-6 border-b border-gray-200 bg-white">
							<h2 class="text-xl font-semibold text-gray-900">Change Password</h2>
							<p class="text-sm text-gray-500 mt-1">Update your account password securely</p>
						</div>						{/* Form */}
						<div class="p-6 space-y-6">
							{/* Current Password */}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Current Password
								</label>
								<input
									type={showPasswordAsTextSignal.value ? "text" : "password"}
									value={currentPassword.value}
									onChange$={(_, el) => {
										currentPassword.value = el.value;
									}}
									autoComplete="current-password"
									class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ddd7c0] focus:border-[#ddd7c0] sm:text-sm bg-white"
									placeholder="Enter your current password"
								/>
							</div>

							{/* New Password */}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									New Password
								</label>
								<input
									type={showPasswordAsTextSignal.value ? "text" : "password"}
									value={newPassword.value}
									onChange$={(_, el) => {
										newPassword.value = el.value;
									}}
									autoComplete="new-password"
									class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ddd7c0] focus:border-[#ddd7c0] sm:text-sm bg-white"
									placeholder="Enter your new password"
								/>
							</div>

							{/* Confirm Password */}
							<div>
								<label class="block text-sm font-medium text-gray-700 mb-2">
									Confirm New Password
								</label>
								<input
									type={showPasswordAsTextSignal.value ? "text" : "password"}
									value={confirmPassword.value}
									onChange$={(_, el) => {
										confirmPassword.value = el.value;
									}}
									autoComplete="new-password"
									class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-[#ddd7c0] focus:border-[#ddd7c0] sm:text-sm bg-white"
									placeholder="Confirm your new password"
								/>
							</div>							{/* Actions */}
							<div class="flex items-center justify-between pt-4">
								<HighlightedButton onClick$={updatePassword}>
									<CheckIcon /> &nbsp; Update Password
								</HighlightedButton>
								
								<button 
									type="button"
									onClick$={togglePasswordFields} 
									class="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ddd7c0] transition-colors"
									title={showPasswordAsTextSignal.value ? "Hide passwords" : "Show passwords"}
								>
									{showPasswordAsTextSignal.value ? (
										<>
											<EyeSlashIcon /> 
											<span class="ml-2">Hide</span>
										</>
									) : (
										<>
											<EyeIcon /> 
											<span class="ml-2">Show</span>
										</>
									)}
								</button>
							</div>

							{/* Success Message */}
							{successMessage.value && (
								<div class="mt-4">
									<Success message={successMessage.value} />
								</div>
							)}

							{/* Error Message */}
							{errorMessage.value && (
								<div class="mt-4">
									<ErrorMessage
										heading="Password Update Failed"
										message={errorMessage.value}
									/>
								</div>							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	) : (
		<div class="h-screen" />
	);
});

export const head = () => {
	return createSEOHead({
		title: 'Change Password',
		description: 'Change your account password securely.',
		noindex: true,
	});
};
