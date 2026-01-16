export interface BookingData {
  single: number;
  couple: number;
  group: number;
  hardCopy: number;
}

export interface Discount {
  id: string;
  code: string;
  amount: number;
  applied: boolean;
}

export type Screen = 'landing' | 'session' | 'payment' | 'success';

