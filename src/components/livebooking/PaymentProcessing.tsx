import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import type { RazorpayOptions, RazorpayResponse } from '@/types/razorpay';

interface PaymentProcessingProps {
  onComplete: (response?: any) => void;
  onCancel?: () => void;
  amount: number; // in rupees
  venue: string;
  requestId?: string;
  hardcopyFilenames?: string[];
}

export function PaymentProcessing({ onComplete, onCancel, amount, venue, requestId, hardcopyFilenames }: PaymentProcessingProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to update booking status on success
  const updateBookingStatus = async () => {
    console.log(`Attempting to update booking status for: ${requestId}`);
    if (!requestId) {
      console.warn('Cannot update booking status: requestId is missing');
      return;
    }

    try {
      const { supabase } = await import('@/utils/livebooking/supabase');
      if (!supabase) {
        console.error('Supabase client not available');
        return;
      }

      const filenames = hardcopyFilenames && hardcopyFilenames.length > 0 ? hardcopyFilenames.join(', ') : null;
      console.log(`Updating status to PAID for ${requestId} with filenames: ${filenames}`);

      const { data, error } = await supabase
        .from('live_bookings')
        .update({
          status: 'PAID',
          hardcopy_filenames: filenames,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', requestId)
        .select();

      if (error) {
        console.error('Supabase update error:', error);
      } else {
        console.log('Successfully updated booking status:', data);
      }
    } catch (e) {
      console.error('Failed to update booking status:', e);
    }
  };

  useEffect(() => {
    const initializePayment = async () => {
      // Check if Razorpay script is loaded
      if (typeof window === 'undefined' || !window.Razorpay) {
        setError('Payment gateway is not available. Please refresh the page.');
        setIsLoading(false);
        return;
      }

      // Get Razorpay key from environment
      const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        setError('Razorpay key is not configured. Please check your environment variables.');
        setIsLoading(false);
        return;
      }

      try {
        // 1. Create Order on Server
        const orderResponse = await fetch('/api/create-razorpay-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            receipt: requestId || `rcpt_${Date.now()}`,
          }),
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          throw new Error(errorData.message || 'Failed to create order');
        }

        const orderData = await orderResponse.json();

        // 2. Initialize Razorpay with Order ID
        const options: RazorpayOptions = {
          key: razorpayKey,
          amount: orderData.amount, // Amount from server order
          currency: orderData.currency,
          name: 'Your Photo Crew',
          description: `Photography Booking - ${venue}`,
          order_id: orderData.id, // Critical: Pass the Order ID
          handler: async function (response: RazorpayResponse) {
            console.log('Payment successful:', response.razorpay_payment_id);
            setIsLoading(true); // Show loading while updating DB
            try {
              // Verify signature here if needed (recommended for security)
              await updateBookingStatus();
            } catch (e) {
              console.error('Failed to update booking status:', e);
            }
            setIsLoading(false);
            onComplete(response);
          },
          theme: {
            color: '#000000',
          },
          modal: {
            ondismiss: function () {
              console.log('Payment cancelled by user');
              setIsLoading(false);
              if (onCancel) {
                onCancel();
              } else {
                // Default behavior: go back to session
                onComplete();
              }
            },
          },
        };

        const razorpay = new window.Razorpay(options);

        // Handle payment errors
        razorpay.on('payment.failed', function (response: any) {
          console.error('Payment failed:', response.error);
          setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
          setIsLoading(false);
        });

        // Open Razorpay checkout
        razorpay.open();
        setIsLoading(false);

      } catch (err: any) {
        console.error('Error initializing Razorpay:', err);
        setError(`Payment initialization failed: ${err.message || 'Please try again.'}`);
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [amount, venue, requestId, hardcopyFilenames, onComplete, onCancel]);


  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-red-50 to-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-medium mb-2 text-red-600">Payment Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                onComplete();
              }
            }}
            className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center max-w-sm"
      >
        {isLoading ? (
          <>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-24 h-24 mx-auto mb-6"
            >
              <div className="w-full h-full bg-blue-500 rounded-full" />
            </motion.div>

            <h2 className="text-xl font-medium mb-2">Loading Payment Gateway</h2>
            <p className="text-gray-600 mb-4">
              Connecting to Razorpay secure payment gateway...
            </p>

            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
              <div className="text-xs text-gray-500 mb-2">Payment Details</div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Method</span>
                <span className="font-medium">Razorpay</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>Amount</span>
                <span className="font-medium">₹{amount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Status</span>
                <span className="text-blue-500 font-medium">Loading...</span>
              </div>
            </div>

            {/* Added details from HowItWorks */}


            <div className="mt-8 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    y: [0, -20, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2 h-2 bg-blue-400 rounded-full"
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <h2 className="text-xl font-medium mb-2">Payment Window Opened</h2>
            <p className="text-gray-600 mb-4">
              Complete your payment in the Razorpay window that just opened.
            </p>
            <p className="text-sm text-gray-500">
              If the payment window didn't open, please check your popup blocker settings.
            </p>
          </>
        )}

        <p className="text-xs text-gray-500 mt-6">
          🔒 Secured by Razorpay
        </p>
      </motion.div>
    </div>
  );
}