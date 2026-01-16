import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Instagram, Linkedin, Heart, Book, Image } from 'lucide-react';

const NeedSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [activeIcon, setActiveIcon] = useState(0);

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

  const needPoints = [
    {
      icon: <div className="flex items-center space-x-1">
        <Instagram className="w-8 h-8 text-secondary" />
        <Linkedin className="w-8 h-8 text-secondary" />
      </div>,
      title: "Transform your social media & personal brand",
      description: "In just one-tenth of a second, a photo can shape someone's opinion. Stand out on social media & professionally."
    },
    {
      icon: <Heart className="w-8 h-8 text-secondary fill-current" />,
      title: "It's A Match!",
      description: "Your pics digitally dictate who you even get to meet."
    },
    {
      icon: <div className="relative">
        <Image className="w-8 h-8 text-secondary" />
        <div className="absolute -right-1 -bottom-1">
          <div className="w-4 h-4 rounded-full border-2 border-secondary"></div>
        </div>
      </div>,
      title: "Let's change the way you see yourself",
      description: "Ever wondered what's the best you could look, with the right venue background & lighting & angle?"
    },
    {
      icon: <Book className="w-8 h-8 text-secondary" />,
      title: "For lasting memories",
      description: "If you are to start on 'the album' of your life, digital or not, why not get it done with a professional veteran like your parents/grandparents did."
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIcon((prev) => (prev === needPoints.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [needPoints.length]);

  return (
    <section id="need" className="py-20 bg-quaternary">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">What do I need a photoshoot for?</h2>
            <div className="w-20 h-1 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
              I'm no actor no model what's having great photos got to do with me? Well, we'd say think again..
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <motion.div 
              variants={itemVariants} 
              className="flex justify-center items-center"
            >
              <div className="relative w-48 h-48 bg-tertiary rounded-full shadow-lg flex items-center justify-center">
                {needPoints.map((point, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: activeIcon === index ? 1 : 0,
                      scale: activeIcon === index ? 1 : 0.8,
                      rotateY: activeIcon === index ? 0 : 90
                    }}
                    transition={{ duration: 0.5 }}
                    className="absolute"
                  >
                    {point.icon}
                  </motion.div>
                ))}
                <div className="absolute -bottom-2 right-0 w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-tertiary font-bold">
                  {activeIcon + 1}/{needPoints.length}
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="md:col-span-2">
              <div className="bg-tertiary p-8 rounded-lg shadow-lg">
                {needPoints.map((point, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ 
                      opacity: activeIcon === index ? 1 : 0,
                      x: activeIcon === index ? 0 : 20,
                      display: activeIcon === index ? 'block' : 'none'
                    }}
                    transition={{ duration: 0.5 }}
                    className="mb-6"
                  >
                    <h3 className="text-2xl font-bold text-primary mb-3">{point.title}</h3>
                    <p className="text-gray-700">{point.description}</p>
                  </motion.div>
                ))}

                <div className="flex justify-between mt-8">
                  <div className="flex space-x-2">
                    {needPoints.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveIcon(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                          activeIcon === index ? 'bg-secondary w-6' : 'bg-gray-300'
                        }`}
                        aria-label={`Go to point ${index + 1}`}
                      />
                    ))}
                  </div>
                  {/* <a
                    href="#services"
                    className="inline-block bg-secondary text-tertiary px-6 py-2 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
                  >
                    Book Your Shoot
                  </a> */}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default NeedSection;