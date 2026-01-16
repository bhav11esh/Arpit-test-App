import { CircleCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface PaymentSuccessProps {
  onBackToBooking: () => void;
}

export function PaymentSuccess({ onBackToBooking }: PaymentSuccessProps) {
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
            <div className="text-sm text-gray-600 mb-3">What's next?</div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Please send that pretyped text which you were directed with on Whatsapp, if you haven't sent already.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Within the next 24 hours of the shoot you'll receive the drive link</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>You'll be handed over the hard copy in a couple of minutes</span>
              </li>
            </ul>
          </div>

          <button
            onClick={onBackToBooking}
            className={`w-full py-4 rounded-lg transition-colors font-medium ${
              'bg-black text-white hover:bg-gray-800'
            }`}
          >
            Back to Home
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}