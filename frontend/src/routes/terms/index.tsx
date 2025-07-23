import { component$ } from '@qwik.dev/core';
import { createSEOHead } from '~/utils/seo';

export default component$(() => {
 return (
 <div class="max-w-4xl mx-auto px-4 py-16">
  <div class="text-center mb-16">
  <h1 class="text-4xl sm:text-5xl font-bold text-black mb-4">Terms of Service</h1>
  <p class="text-lg text-gray-600 max-w-2xl mx-auto">
   The rules, guidelines, and agreements for using our website and purchasing our products.
  </p>
  </div>

  <div class="prose prose-lg max-w-none text-gray-600">
  <p>Last Updated: May 24, 2025</p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Introduction</h2>
  <p>
   Welcome to Damned Designs. These Terms of Service ("Terms") govern your access to and use of our website, products, and services. By accessing or using our website, you agree to be bound by these Terms and our Privacy Policy.
  </p>
  <p>
   Please read these Terms carefully before using our website. If you do not agree to all the terms and conditions of this agreement, you may not access or use our website or services.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Use of Our Website</h2>
  <h3 class="text-xl font-bold mt-6 mb-3">Account Registration</h3>
  <p>
   To access certain features of our website, you may be required to register for an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
  </p>
  
  <h3 class="text-xl font-bold mt-6 mb-3">Prohibited Activities</h3>
  <p>You agree not to:</p>
  <ul class="list-disc pl-5 space-y-2">
   <li>Use our website in any way that violates any applicable federal, state, local, or international law or regulation</li>
   <li>Use our website to transmit or send unsolicited commercial communications</li>
   <li>Engage in any conduct that restricts or inhibits anyone's use or enjoyment of our website</li>
   <li>Attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of our website</li>
   <li>Use any robot, spider, or other automatic device to access our website</li>
   <li>Introduce any viruses, Trojan horses, worms, or other material that is malicious or technologically harmful</li>
  </ul>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Products and Purchases</h2>
  <h3 class="text-xl font-bold mt-6 mb-3">Product Information</h3>
  <p>
   We strive to display our products and their features accurately on our website. However, we do not guarantee that product descriptions, colors, or other content on our website are accurate, complete, reliable, current, or error-free.
  </p>
  
  <h3 class="text-xl font-bold mt-6 mb-3">Pricing and Payment</h3>
  <p>
   All prices are shown in US dollars and do not include taxes or shipping costs, which are calculated at checkout. We reserve the right to change prices at any time without notice. Payment must be made at the time of purchase through our secure payment system.
  </p>
  
  <h3 class="text-xl font-bold mt-6 mb-3">Order Acceptance and Fulfillment</h3>
  <p>
   Your receipt of an order confirmation does not constitute our acceptance of your order. We reserve the right to limit or cancel quantities purchased per person, per household, or per order. We also reserve the right to refuse any order at our sole discretion.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Intellectual Property</h2>
  <p>
   Our website and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio) are owned by Damned Designs, its licensors, or other providers of such material and are protected by United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Disclaimer of Warranties</h2>
  <p>
   Our website and products are provided on an"as is" and"as available" basis, without any warranties of any kind, either express or implied. We disclaim all warranties, express or implied, including but not limited to implied warranties of merchantability and fitness for a particular purpose.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Limitation of Liability</h2>
  <p>
   In no event will Damned Designs, its affiliates, or their licensors, service providers, employees, agents, officers, or directors be liable for damages of any kind, under any legal theory, arising out of or in connection with your use of our website or products, including any direct, indirect, special, incidental, consequential, or punitive damages.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Indemnification</h2>
  <p>
   You agree to defend, indemnify, and hold harmless Damned Designs, its affiliates, licensors, and service providers, and its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms or your use of our website.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Changes to Terms of Service</h2>
  <p>
   We may revise and update these Terms from time to time at our sole discretion. All changes are effective immediately when we post them. Your continued use of our website following the posting of revised Terms means that you accept and agree to the changes.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Governing Law</h2>
  <p>
   These Terms and any dispute or claim arising out of or related to them, their subject matter, or their formation shall be governed by and construed in accordance with the laws of the state of [Your State], without giving effect to any choice or conflict of law provision or rule.
  </p>
  
  <h2 class="text-2xl font-bold text-black mt-8 mb-4">Contact Us</h2>
  <p>
   If you have any questions about these Terms of Service, please contact us at:
  </p>
  <div class="mt-4">
   <p><strong>Damned Designs</strong></p>
   <p>Email: legal@damneddesigns.com</p>
   <p>Phone: (555) 123-4567</p>
  </div>
  </div>
 </div>
 );
});

export const head = () =>
 createSEOHead({
 title: 'Terms of Service',
 description: 'Terms of Service for Damned Designs. Rules, guidelines, and agreements for using our website and purchasing our products.',
 noindex: false,
 });

