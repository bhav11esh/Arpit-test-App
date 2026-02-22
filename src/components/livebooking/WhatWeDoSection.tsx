import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WhatWeDoSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export function WhatWeDoSection({ expanded, onToggle }: WhatWeDoSectionProps) {
  return (
    <div className="border-t border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">What do we do?</span>
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
            <div className="px-6 pb-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                We turn your café outing into a keepsake.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                A professional photographer captures natural photos of your table in just 5 minutes.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                Only buy if you love a photo — your hard copy is printed instantly, and the full set is shared via Drive within 8 hours.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

