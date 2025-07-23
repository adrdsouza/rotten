import { component$ } from '@qwik.dev/core';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
	return (
		<div class="bg-white py-6 sm:py-8 lg:py-10">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
				<div class="max-w-6xl mx-auto">					<div class="bg-gray-100 rounded-lg p-8 lg:p-12 shadow-xl">
						<div class="grid lg:grid-cols-2 gap-12 lg:gap-16">
							{/* Right Column: Contact Information - Now First on Mobile */}
							<div class="order-1 lg:order-2">
								<h2 class="text-3xl font-bold text-gray-900 mb-6">Get In Touch</h2>
								
								{/* Contact Info */}
								<div class="space-y-6 mb-8">
									<div class="flex items-start space-x-4">
										<div class="flex-shrink-0">
											<svg class="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
											</svg>
										</div>
										<div>
											<h3 class="font-semibold text-gray-900">Email</h3>
											<p class="text-gray-600">info@damneddesigns.com</p>
										</div>
									</div>

									<div class="flex items-start space-x-4">
										<div class="flex-shrink-0">
											<svg class="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
										</div>
										<div>
											<h3 class="font-semibold text-gray-900">Address</h3>
											<p class="text-gray-600">
												169 Madison Ave STE 15182<br />
												New York, NY 10016<br />
												United States
											</p>
										</div>
									</div>
								</div>

								{/* Business Policies */}
								<div class="space-y-6">
									<div class="bg-gray-50 rounded-lg p-6">
										<h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
											<svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
											</svg>
											Shipping Policy
										</h3>
										<p class="text-gray-600 text-sm">In stock products ship within 2 working days via standard shipping.</p>
									</div>

									<div class="bg-gray-50 rounded-lg p-6">
										<h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
											<svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
											Warranty Policy
										</h3>
										<p class="text-gray-600 text-sm">Free return or replacement for factory defects within 2 days of receipt. Contact us with photo evidence of any defects.</p>
									</div>									
									<div class="bg-gray-50 rounded-lg p-6">
										<h3 class="text-lg font-semibold text-gray-900 mb-3 flex items-center">
											<svg class="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.50 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
											</svg>
											Spare Parts
										</h3>
										<p class="text-gray-600 text-sm">Contact us with your product model and specific part information before purchasing any replacement components.</p>
									</div>
								</div>
							</div>							{/* Left Column: Our Story & Values - Now Second on Mobile */}
							<div class="order-2 lg:order-1">
								<h2 class="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
								<div class="space-y-6 text-gray-700 leading-relaxed">
									<p>
										Founded with a passion for precision and innovation, Damned Designs has been creating exceptional products using state-of-the-art CNC manufacturing technology. Our journey began with a simple mission: to deliver uncompromising quality through advanced manufacturing precision.
									</p>
									<p>
										Every product that leaves our facility is a testament to our commitment to excellence. Using computer-controlled precision manufacturing, we ensure consistent quality and attention to detail that meets the highest standards our customers expect.
									</p>
									<p>
										Our dedication to manufacturing precision, combined with rigorous quality control processes, has earned us the trust of customers worldwide. We take pride in our ability to deliver products that not only meet but exceed expectations.
									</p>
									
									{/* Our Values - Integrated */}
									<div class="mt-8 pt-8 border-t border-gray-200">
										<h3 class="text-xl font-bold text-gray-900 mb-4">Our Values</h3>
										<div class="space-y-4">
											<div class="flex items-start space-x-3">
												<div class="flex-shrink-0 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center mt-1">
													<span class="text-white text-xs font-bold">✓</span>
												</div>
												<div>
													<h4 class="font-semibold text-gray-900">Precision Manufacturing</h4>
													<p class="text-sm text-gray-600">Every product crafted with CNC precision and meticulous attention to detail</p>
												</div>
											</div>
											<div class="flex items-start space-x-3">
												<div class="flex-shrink-0 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center mt-1">
													<span class="text-white text-xs font-bold">✓</span>
												</div>
												<div>
													<h4 class="font-semibold text-gray-900">Quality Assurance</h4>
													<p class="text-sm text-gray-600">Rigorous testing and quality control ensure consistent excellence</p>
												</div>
											</div>
											<div class="flex items-start space-x-3">
												<div class="flex-shrink-0 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center mt-1">
													<span class="text-white text-xs font-bold">✓</span>
												</div>
												<div>
													<h4 class="font-semibold text-gray-900">Customer Focus</h4>
													<p class="text-sm text-gray-600">Dedicated support team ensuring exceptional customer experience</p>
												</div>
											</div>
										</div>
									</div>
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
		title: 'Contact & About Us',
		description: 'Get in touch for product inquiries, support, or questions about our precision-manufactured knives. Learn about our story, policies, and commitment to quality.',
		noindex: false,
	});
};
