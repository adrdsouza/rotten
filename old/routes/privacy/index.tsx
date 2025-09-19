import { component$ } from '@qwik.dev/core';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
 return (
 <div class="max-w-4xl mx-auto px-4 py-16">
  <div class="text-center mb-16">
  <h1 class="text-4xl sm:text-5xl font-bold text-black mb-4">Privacy Policy</h1>
  <p class="text-lg text-gray-600 max-w-2xl mx-auto">
   How we collect, use, and protect your personal information.
  </p>
  </div>

  <div class="prose prose-lg max-w-none text-gray-600">
  <p>Last Updated: May 24, 2025</p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Introduction</h2>
  <p>
   Rotten Hand ("we,""our," or"us") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, make a purchase, or interact with us in any way.
  </p>
  <p>
   Please read this Privacy Policy carefully. By accessing or using our website, you acknowledge that you have read, understood, and agree to be bound by all the terms of this Privacy Policy.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Information We Collect</h2>
  <p>We may collect the following types of information:</p>
  
  <h3 class="text-xl font-bold mt-6 mb-3">Personal Information</h3>
  <ul class="list-disc pl-5 space-y-2">
   <li>Name, email address, phone number, and billing/shipping address</li>
   <li>Payment information (credit card numbers, billing address)</li>
   <li>Purchase history and product preferences</li>
   <li>Communications with our customer service team</li>
  </ul>
  
  <h3 class="text-xl font-bold mt-6 mb-3">Automatically Collected Information</h3>
  <ul class="list-disc pl-5 space-y-2">
   <li>IP address and device information</li>
   <li>Browser type and version</li>
   <li>Operating system</li>
   <li>Referring website</li>
   <li>Pages viewed and time spent on our website</li>
   <li>Links clicked and actions taken on our website</li>
  </ul>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">How We Use Your Information</h2>
  <p>We may use the information we collect for various purposes, including:</p>
  <ul class="list-disc pl-5 space-y-2">
   <li>Processing and fulfilling your orders</li>
   <li>Communicating with you about your order or account</li>
   <li>Providing customer support</li>
   <li>Sending you marketing communications (with your consent)</li>
   <li>Improving our website, products, and services</li>
   <li>Detecting and preventing fraud</li>
   <li>Complying with legal obligations</li>
  </ul>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Sharing Your Information</h2>
  <p>We may share your information with:</p>
  <ul class="list-disc pl-5 space-y-2">
   <li>Service providers who help us operate our business (payment processors, shipping companies, etc.)</li>
   <li>Marketing partners (with your consent)</li>
   <li>Legal authorities when required by law</li>
   <li>Successor entities in the event of a merger, acquisition, or sale of all or a portion of our assets</li>
  </ul>
  <p>We do not sell your personal information to third parties.</p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Your Rights and Choices</h2>
  <p>Depending on your location, you may have certain rights regarding your personal information, including:</p>
  <ul class="list-disc pl-5 space-y-2">
   <li>Accessing, correcting, or deleting your personal information</li>
   <li>Withdrawing consent for marketing communications</li>
   <li>Requesting a copy of your personal information</li>
   <li>Objecting to certain processing of your personal information</li>
  </ul>
  <p>To exercise these rights, please contact us using the information provided at the end of this policy.</p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Security</h2>
  <p>
   We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, accidental loss, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Changes to This Privacy Policy</h2>
  <p>
   We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. The updated version will be indicated by an updated"Last Updated" date, and the updated version will be effective as soon as it is accessible.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Contact Us</h2>
  <p>
   If you have questions or concerns about this Privacy Policy or our privacy practices, please contact us at:
  </p>
  <div class="mt-4">
   <p><strong>Rotten Hand</strong></p>
   <p>Email: privacy@rottenhand.com</p>
   <p>Phone: (555) 123-4567</p>
  </div>
  </div>
 </div>
 );
});

export const head = () =>
 createSEOHead({
 title: 'Privacy Policy',
 description: 'Privacy policy for Rotten Hand. Learn how we protect your data and respect your privacy.',
 noindex: false,
 });

