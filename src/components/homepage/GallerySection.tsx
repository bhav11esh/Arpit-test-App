import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const GallerySection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isBeforeShown, setIsBeforeShown] = useState(true);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
      },
    },
  };

  const beforeAfterPairs = [
    {
      before: 'assets/homepage/beforeafter/AKR05513.jpg',
      after: 'assets/homepage/beforeafter/AKR05513-2.jpg',
      category: 'Portrait',
    },
    {
      before: 'assets/homepage/beforeafter/AKR05549.jpg',
      after: 'assets/homepage/beforeafter/AKR05549-2.jpg',
      category: 'Fashion',
    },
    {
      before: 'assets/homepage/beforeafter/AKR05416.jpg',
      after: 'assets/homepage/beforeafter/AKR05416-2.jpg',
      category: 'Professional',
    },
  ];

  useEffect(() => {
    const beforeTimer = setTimeout(() => {
      setIsBeforeShown(false);
    }, 1000);

    const slideTimer = setTimeout(() => {
      setCurrentSlide((prev) => (prev === beforeAfterPairs.length - 1 ? 0 : prev + 1));
      setIsBeforeShown(true);
    }, 3000);

    return () => {
      clearTimeout(beforeTimer);
      clearTimeout(slideTimer);
    };
  }, [currentSlide, beforeAfterPairs.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === beforeAfterPairs.length - 1 ? 0 : prev + 1));
    setIsBeforeShown(true);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? beforeAfterPairs.length - 1 : prev - 1));
    setIsBeforeShown(true);
  };

  const testimonials = [
    {
      text: "YourPhotoCrew transformed my dating profile! The photos are amazing and I've received so many more matches.",
      name: "Rahul S.",
    },
    {
      text: "The team was professional, fun, and made me feel comfortable. The photos exceeded my expectations!",
      name: "Priya M.",
    },
    {
      text: "Affordable and high-quality. I couldn't believe how good the photos turned out for such a reasonable price.",
      name: "Vikram J.",
    },
  ];

  return (
    <section id="gallery" className="py-20 bg-tertiary">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Our Work Speaks for Itself</h2>
            <div className="w-20 h-1 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
              Check out some of our stunning before-and-after shots and testimonials from happy clients.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mb-16">
            <div className="relative">
              <div className="overflow-hidden rounded-lg shadow-lg aspect-[16/9]">
                <img
                  src={isBeforeShown ? beforeAfterPairs[currentSlide].before : beforeAfterPairs[currentSlide].after}
                  alt={`${isBeforeShown ? 'Before' : 'After'} photo ${currentSlide + 1}`}
                  className="w-full h-full object-cover transition-all duration-500"
                />
                <div className="absolute top-4 left-4 bg-secondary text-tertiary px-4 py-2 rounded-full font-medium">
                  {isBeforeShown ? 'Before' : 'After'}
                </div>
                <div className="absolute bottom-4 right-4 bg-primary bg-opacity-75 text-tertiary px-4 py-2 rounded-full font-medium">
                  {beforeAfterPairs[currentSlide].category}
                </div>
              </div>

              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-tertiary text-primary p-2 rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-tertiary text-primary p-2 rounded-full shadow-lg hover:bg-gray-100 transition-all duration-300"
                aria-label="Next slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-quaternary p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className="w-5 h-5 text-secondary"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                  <p className="font-semibold text-primary">{testimonial.name}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center mt-12">
            <a
              href=""
              className="inline-block bg-secondary text-tertiary px-6 py-3 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
            >
              View Full Gallery
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default GallerySection;