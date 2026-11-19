// Abstraction: IPaymentGateway interface decouples payment processing

export interface IPaymentGateway {
  processPayment(amount: number, userId: string): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount: number): Promise<boolean>;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  message: string;
}

// Mock Stripe implementation
export class MockStripeGateway implements IPaymentGateway {
  async processPayment(amount: number, userId: string): Promise<PaymentResult> {
    // Simulate payment processing
    const transactionId = `stripe_${Date.now()}_${userId}`;
    return {
      success: true,
      transactionId,
      message: `Payment of ₹${amount} processed via Stripe`,
    };
  }

  async refundPayment(transactionId: string, amount: number): Promise<boolean> {
    console.log(`Refund of ₹${amount} processed for transaction: ${transactionId}`);
    return true;
  }
}

// Mock PayPal implementation
export class MockPayPalGateway implements IPaymentGateway {
  async processPayment(amount: number, userId: string): Promise<PaymentResult> {
    const transactionId = `paypal_${Date.now()}_${userId}`;
    return {
      success: true,
      transactionId,
      message: `Payment of ₹${amount} processed via PayPal`,
    };
  }

  async refundPayment(transactionId: string, amount: number): Promise<boolean> {
    console.log(`PayPal refund of ₹${amount} for: ${transactionId}`);
    return true;
  }
}
