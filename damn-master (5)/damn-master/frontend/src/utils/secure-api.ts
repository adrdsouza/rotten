import { processNMIPayment } from '~/providers/shop/checkout/checkout';

/**
 * Simple wrapper for NMI payment processing
 * Note: reCAPTCHA functionality has been removed as requested
 */
export const secureProcessNMIPayment = async (cardData: {
	cardNumber: string;
	expiryDate: string;
	cvv: string;
}) => {
	// Pass through to the original function without reCAPTCHA
	return processNMIPayment(cardData);
};