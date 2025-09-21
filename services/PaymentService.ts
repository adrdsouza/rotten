import paymentMethods from '../data/payment-methods.json';

export interface PaymentMethod {
  id: string;
  code: string;
  enabled: boolean;
  name: string;
  description: string;
}

export class PaymentService {
  static getPaymentMethods(): PaymentMethod[] {
    return paymentMethods.filter(method => method.enabled);
  }
}