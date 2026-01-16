import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface HeroCarouselProps {
  qrScanned: boolean;
  venue: string;
}

const taglines = [
  "capture the moment",
  "freeze time beautifully",
  "your story, framed",
  "memories worth keeping"
];

export function HeroCarousel({ qrScanned, venue }: HeroCarouselProps) {
  const [currentTagline, setCurrentTagline] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTagline(prev => (prev + 1) % taglines.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div className="aspect-[16/9] overflow-hidden bg-gray-100">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1610963490387-0c08126eacf8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwcmVzdGF1cmFudCUyMGludGVyaW9yfGVufDF8fHx8MTc2NjQxMDg2MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
          alt="Venue"
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTagline}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-white text-3xl font-serif italic text-center px-6"
          >
            {taglines[currentTagline]}
          </motion.div>
        </AnimatePresence>
      </div>

      {qrScanned && venue && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <div className="inline-block bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
            📍 You're at {venue}
          </div>
        </div>
      )}
    </div>
  );
}

