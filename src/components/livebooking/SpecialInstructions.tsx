import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SpecialInstructionsProps {
  expanded: boolean;
  onToggle: () => void;
}

const instructions = [
  'Please arrive 5 minutes before your scheduled time',
  'Dress code: Smart casual recommended',
  'Props and accessories available upon request',
  'Natural lighting works best - outdoor shots preferred',
  'Group photos accommodate up to 8 people',
];

export function SpecialInstructions({ expanded, onToggle }: SpecialInstructionsProps) {
  return (
    <div className="border-t border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">Special Instructions</span>
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
            <div className="px-6 pb-6 space-y-3">
              {instructions.map((instruction, index) => (
                <div key={index} className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">{instruction}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
