import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const taglines = [
  "capture the moment",
  "freeze time beautifully",
  "your story, framed",
  "memories worth keeping"
];

export function RotatingTaglines() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % taglines.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-8 text-center min-h-[80px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-serif italic text-gray-800"
        >
          {taglines[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
