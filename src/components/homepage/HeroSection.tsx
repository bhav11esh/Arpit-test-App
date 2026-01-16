import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const firstColumnRef = useRef(null);
  const secondColumnRef = useRef(null);
  const scrollInterval = useRef(null);

  const slides = [
    { image: "assets/homepage/hero/image-1.jpg", title: "Capture Moments, Not Budgets📸" },
    { image: "assets/homepage/hero/image-2.jpg", title: "Shoot At A Price Of A Coffee Date🤩" },
    { image: "assets/homepage/hero/image-3.jpg", title: "Better Than Your Buddy's Phone😎" },
    { image: "assets/homepage/hero/image-4.jpg", title: "Come Get 'THAT PIC'✨" },
  ];

  const imagesColumnOne = [
    "assets/homescheduled/bus-1.jpg",
    "assets/homescheduled/couple-1.jpg",
    "assets/homescheduled/male-1.jpg",
    "assets/homescheduled/female-1.jpg",
  ];

  const imagesColumnTwo = [
    "assets/homescheduled/female-3.jpg",
    "assets/homescheduled/male-3.jpg",
    "assets/gallery/couple/couple-3.jpg",
    "assets/homescheduled/bus-3.jpg",
  ]

  // Duplicate images to create seamless loop
  const duplicatedImagesColumnOne = [...imagesColumnOne, ...imagesColumnOne];
  const duplicatedImagesColumnTwo = [...imagesColumnTwo, ...imagesColumnTwo];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const startScrolling = () => {
      const scrollStep = 1;
      const scrollDelay = 50;

      scrollInterval.current = setInterval(() => {
        if (firstColumnRef.current) {
          firstColumnRef.current.scrollTop += scrollStep;
          if (firstColumnRef.current.scrollTop >= firstColumnRef.current.scrollHeight / 2) {
            firstColumnRef.current.scrollTop = 0;
          }
        }

        if (secondColumnRef.current) {
          secondColumnRef.current.scrollTop -= scrollStep;
          if (secondColumnRef.current.scrollTop <= 0) {
            secondColumnRef.current.scrollTop = secondColumnRef.current.scrollHeight / 2;
          }
        }
      }, scrollDelay);
    };

    startScrolling();

    return () => {
      if (scrollInterval.current) {
        clearInterval(scrollInterval.current);
      }
    };
  }, []);

  return (
    <section id="home" className="bg-primary relative h-screen flex flex-col md:flex-row items-center px-6 md:px-16 overflow-hidden mt-20 md:mt-0 lg:mt-0">
      {/* Left Content */}
      <div className="w-full md:w-1/2 flex flex-col justify-center h-full text-left">
        <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <h1 className="text-4xl md:text-6xl font-bold text-tertiary mb-6 leading-tight">
            {slides[currentSlide].title}
          </h1>
          <p className="text-tertiary mb-8 italic">
            "We specialize in portrait photography for first-timers. Camera shy or out of poses? Don't worry—we hire
            someone to keep you laughing and posing naturally. And with our affordable prices, great photos go from 'good
            to have' to 'too good not to have'."
          </p>
          <div className="flex space-x-4 mb-6">
            <motion.a
              href="/services"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-secondary text-tertiary px-6 py-3 rounded-full font-medium text-lg hover:bg-opacity-90 transition-all"
            >
              Schedule Shoot
            </motion.a>
            <motion.a
              href="/gallery"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="border-2 border-tertiary text-tertiary px-6 py-3 rounded-full font-medium text-lg hover:bg-tertiary hover:text-primary transition-all"
            >
              View Gallery
            </motion.a>
          </div>

          {/* Find Us Section */}
          <div className="mt-8">
            <h2 className="text-xl text-tertiary mb-4">Find us on:</h2>
            <div className="flex space-x-6">
              <img src="assets/homepage/paytm-insider.svg" alt="Paytm Insider" className="w-32 h-auto bg-tertiary p-2 rounded" />
              <img src="assets/homepage/bookmyshow-logo.svg" alt="BookMyShow" className="w-32 h-auto bg-tertiary p-2 rounded" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right Photo Grid with Vertical Scrolling */}
      <motion.div
        className="w-full md:w-1/2 flex gap-2 md:gap-4 h-full p-4 md:p-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
      >
        {/* First Column - Scrolls Down */}
        <div
          ref={firstColumnRef}
          className="w-1/2 flex flex-col gap-2 md:gap-4 overflow-y-hidden h-full"
          style={{
            scrollBehavior: 'auto',
          }}
        >
          {duplicatedImagesColumnOne.map((image, index) => (
            <motion.div
              key={`first-col-${index}`}
              className="rounded-lg overflow-hidden flex-shrink-0"
              style={{ height: '300px' }}
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={image}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>

        {/* Second Column - Scrolls Up */}
        <div
          ref={secondColumnRef}
          className="w-1/2 flex flex-col gap-2 md:gap-4 overflow-y-hidden h-full"
          style={{
            scrollBehavior: 'auto',
          }}
        >
          {duplicatedImagesColumnTwo.map((image, index) => (
            <motion.div
              key={`second-col-${index}`}
              className="rounded-lg overflow-hidden flex-shrink-0"
              style={{ height: '300px' }}
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={image}
                alt={`Slide ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Scroll Down Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 cursor-pointer"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
      >
        <ChevronDown className="text-tertiary w-10 h-10" />
      </motion.div>
    </section>
  );
};

export default HeroSection;