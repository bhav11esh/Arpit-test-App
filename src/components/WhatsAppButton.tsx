import React from 'react';
import { motion } from 'framer-motion';
import { useState } from 'react';

const WhatsAppButton: React.FC = () => {
 const [activeText, setActiveText] = useState(0);
  return (
    <motion.a
      href="https://wa.me/7676235229"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg z-50 flex items-center justify-center overflow-hidden"
      whileHover={{ width: 160, borderRadius: 24 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 50, width: 56 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
      onHoverStart={() => setActiveText(1)}
      onHoverEnd={() => setActiveText(0)}
      aria-label="Contact us on WhatsApp"
    >
      {/* WhatsApp SVG */}
      <img src="assets/homepage/whatsapp.svg" alt="WhatsApp" className={`${activeText === 1 ? '' : 'absolute'} w-6 h-6`} />

      {/* Help & Support Text */}
      <motion.span
        className={`${activeText === 1 ? 'opacity-100 transition-opacity duration-500 text-white z-10000' : 'hidden'} ml-2 text-sm font-semibold whitespace-nowrap`}
        // initial={{ opacity: 0, x: -10 }}
        // whileHover={{ opacity: 1, x: 0 }}
        // transition={{ duration: 0.5 }}
      >
        Help & Support
      </motion.span>
    </motion.a>
  );
};

export default WhatsAppButton;