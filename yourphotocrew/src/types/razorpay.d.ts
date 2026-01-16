// Razorpay type definitions

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id?: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  notes?: Record<string, string>;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface Razorpay {
  open(): void;
  on(event: string, callback: (response: any) => void): void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => Razorpay;
  }
}

