import { MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface WhatsAppRedirectProps {
  venue: string;
  onProceed: () => void;
}

export function WhatsAppRedirect({ venue, onProceed }: WhatsAppRedirectProps) {
  const requestId = `HITW_${new Date().toLocaleDateString('en-GB').replace(/\//g, '')}${new Date().getHours()}${new Date().getMinutes()}_T04`;
  
  const message = `I want to try it out\nRequest ID: ${requestId}`;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-green-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-sm"
      >
        <div className="w-24 h-24 mx-auto mb-6 bg-green-500 rounded-full flex items-center justify-center">
          <MessageCircle className="w-12 h-12 text-white" />
        </div>
        
        <h2 className="text-xl font-medium mb-2">Almost There!</h2>
        <p className="text-gray-600 mb-6">
          Send this message to our photographer via WhatsApp to confirm your booking.
        </p>

        <div className="bg-white border-2 border-green-200 rounded-lg p-4 mb-6 text-left">
          <div className="text-sm text-gray-600 mb-2">Your message:</div>
          <div className="bg-green-50 rounded-lg p-3 whitespace-pre-line text-sm">
            {message}
          </div>
        </div>

        <button
          onClick={onProceed}
          className="w-full py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 mb-3"
        >
          <MessageCircle className="w-5 h-5" />
          Open WhatsApp
        </button>

        <p className="text-xs text-gray-500">
          This will redirect you to WhatsApp. Return here to complete payment.
        </p>
      </motion.div>
    </div>
  );
}
