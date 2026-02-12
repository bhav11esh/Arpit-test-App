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
                We're uniquely positioned in this domain coming from a portraiture shoot background geared towards people coming in front of a professional the very first time.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                The photographer helps you with all the poses you need. We are ready to spend as much effort as you need with no rush until you're satisfied with the pic.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mt-3">
                You can get the Google drive link with all your photos within the next 8 hours. Hardcopies handed over right away.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

