import { CircleCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface PaymentSuccessProps {
  onBackToBooking: () => void;
  requestId?: string;
}

export function PaymentSuccess({ onBackToBooking, requestId }: PaymentSuccessProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-green-50 to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2
          }}
          className="mb-6"
        >
          <CircleCheck className="w-24 h-24 text-green-500 mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-medium mb-2">Payment Received!</h2>

          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <div className="text-sm text-gray-600 mb-3 font-semibold">What's next?</div>
            <ul className="space-y-3 text-[13px] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>
                  After some hours type <strong>yourphotocrew.com</strong> as a URL and go to Live Booking Section.
                  Please Get your drive link by entering your Booking ID: <strong>{requestId || 'N/A'}</strong> in the search bar.
                  <strong> So please don't forget to take screenshot of this Screen to Remember your Request ID</strong>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Within the next 24 hours of the shoot you'll receive the drive link</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>You'll be handed over the hard copy in a couple of minutes</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onBackToBooking}
            className={`w-full py-4 rounded-lg transition-colors font-medium ${'bg-black text-white hover:bg-gray-800'
              }`}
          >
            Back to Home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}