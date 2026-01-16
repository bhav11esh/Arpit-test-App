import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VenueInstructionsProps {
  expanded: boolean;
  onToggle: () => void;
  venue: string;
}

const venueInstructions = [
  'Venue operating hours: 9:00 AM - 11:00 PM',
  'Photography service available during venue hours',
  'Please respect other customers and maintain noise levels',
  'Minimum order required at venue',
  'Free parking available for customers',
];

export function VenueInstructions({ expanded, onToggle, venue }: VenueInstructionsProps) {
  return (
    <div className="border-t border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">Venue Instructions</span>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              {/* Venue Dropdown */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg">
                <span>{venue}</span>
                <ChevronDown className="w-4 h-4 opacity-30 ml-auto" />
              </div>

              {/* Instructions */}
              <div className="space-y-3">
                {venueInstructions.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}