import { ChevronDown, ChevronUp, Camera, Eye, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface HowItWorksSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

const steps = [
  { icon: Camera, title: '5 min table shoot', description: 'Quick professional photos', expandable: true },
  { icon: Eye, title: 'Review camera roll', description: 'Photos shown immediately post session', expandable: false },
  { icon: CreditCard, title: 'Pay only if you like', description: 'No obligation', expandable: false },
];

export function HowItWorksSection({ expanded, onToggle }: HowItWorksSectionProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="border-t border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">How it works</span>
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
              {steps.map((step, index) => (
                <div key={index}>
                  <div
                    className={`flex items-start gap-4 ${step.expandable ? 'cursor-pointer' : ''}`}
                    onClick={() => step.expandable && setExpandedStep(expandedStep === index ? null : index)}
                  >
                    <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{step.title}</div>
                        {step.expandable && (
                          <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                            {expandedStep === index ?
                              <ChevronUp className="w-3.5 h-3.5 text-white stroke-[3]" /> :
                              <ChevronDown className="w-3.5 h-3.5 text-white stroke-[3]" />
                            }
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">{step.description}</div>
                    </div>
                  </div>

                  {/* Expandable content for 20 min shoot */}
                  <AnimatePresence>
                    {step.expandable && expandedStep === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden ml-14 mt-2"
                      >
                        <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-lg">
                          <div className="font-semibold text-gray-800">₹99 (Base Package):</div>
                          <div>• ~ 20 photos per 5 min session</div>
                          <div>• One 4×6-inch lab quality hard-copy photograph</div>


                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <p className="text-xs text-gray-500 italic mt-4">
                1 hard copy included with each booking. Additional copies available.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

