import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NewTestimonialsSection = () => {
  const reviewPhotos = [
    'assets/reviews/review-1.jpg',
    'assets/reviews/review-2.jpg',
    'assets/reviews/review-3.jpg',
    'assets/reviews/review-4.jpg',
    'assets/reviews/review-5.jpg',
    'assets/reviews/review-6.jpg',
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % reviewPhotos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [reviewPhotos.length]);

  const nextSlide = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % reviewPhotos.length);
  };

  const prevSlide = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? reviewPhotos.length - 1 : prevIndex - 1
    );
  };

  const goToSlide = (index) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0.5,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.5 }
    },
    exit: (direction) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0.5,
      transition: { duration: 0.5 }
    })
  };

  return (
    <section id="testimonials" className="py-20 bg-quaternary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
            Client Testimonials
          </h2>
          <div className="w-24 h-1 bg-secondary mx-auto"></div>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Navigation Arrows */}
          <button 
            onClick={prevSlide}
            className="absolute left-4 md:-left-12 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-primary p-3 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button 
            onClick={nextSlide}
            className="absolute right-4 md:-right-12 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-primary p-3 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Carousel - Now with contain instead of cover */}
          <div className="relative h-auto min-h-[400px] md:min-h-[500px] overflow-hidden rounded-2xl shadow-xl bg-gray-100 flex items-center justify-center">
            <AnimatePresence custom={direction} initial={false}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 flex items-center justify-center p-4"
              >
                <img
                  src={reviewPhotos[currentIndex]}
                  alt={`Client testimonial ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain shadow-sm"
                  style={{ width: 'auto', height: 'auto' }}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Indicators */}
          <div className="flex justify-center mt-8 gap-2">
            {reviewPhotos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentIndex === index ? 'bg-secondary w-8' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewTestimonialsSection;