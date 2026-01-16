import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Camera, Users, Clock, Sparkles, Eye, ShieldMinus, Ribbon} from 'lucide-react';

const AboutSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

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

  const teamImages = [
    'https://images.unsplash.com/photo-1556103255-4443dbae8e5a?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
    'https://images.unsplash.com/photo-1552642986-ccb41e7059e7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80',
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80',
  ];

  return (
    <section id="about" className="py-20 bg-tertiary">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Who We Are</h2>
            <div className="w-20 h-1 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
            We are a crew dedicated to capturing both your story and persona. Whether it’s a candid café shot, a polished business profile, or a themed portrait, we combine creative expertise with a relaxed experience. We take responsibility for making you feel comfortable and confident, helping you discover your best look while preserving memories and building a strong personal brand.
            </p>
          </motion.div>

          <div className="flex md:flex-col gap-12 items-center mb-16">
            <motion.div variants={itemVariants} className="order-2 md:order-1">
              <div className="flex align-center gap-6 sm:flex-row flex-col">
                {[
                  {
                    icon: <ShieldMinus className="w-10 h-10 text-secondary" />,
                    title: 'Our Mission',
                    description: 'Making high-quality photography accessible and affordable — helping you look and feel your best.',
                  },
                  {
                    icon: <Eye className="w-10 h-10 text-secondary" />,
                    title: 'Our Craft',
                    description: 'Skilled photographers using top-tier equipment to capture candid, natural moments and polished portraits.',
                  },
                  {
                    icon: <Users className="w-10 h-10 text-secondary" />,
                    title: 'Our Experience',
                    description: 'We take responsibility for making you laugh and pose, creating such a comfortable atmosphere that the shoot feels effortless.',
                  },
                  {
                    icon: <Ribbon className="w-10 h-10 text-secondary" />,
                    title: 'Our Promise',
                    description: 'From setting the scene to styling your wardrobe to the final edit — we take care of every detail so you can focus on the moment while we capture it.',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className="w-full md:w-1/2 bg-quaternary p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="mb-4">{item.icon}</div>
                    <h3 className="text-xl font-semibold text-primary mb-2">{item.title}</h3>
                    <p className="text-gray-700">{item.description}</p>
                  </motion.div>
                ))}
              </div>
              {/* <motion.div variants={itemVariants} className="mt-8">
                <a
                  href="#services"
                  className="inline-block bg-secondary text-tertiary px-6 py-3 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
                >
                  Learn More About Us
                </a>
              </motion.div> */}
            </motion.div>

            {/* <motion.div variants={itemVariants} className="order-1 md:order-2">
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  {teamImages.map((image, index) => (
                    <div
                      key={index}
                      className={`overflow-hidden rounded-lg shadow-lg ${
                        index === 2 ? 'col-span-2' : ''
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Team member ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute -bottom-6 -right-6 bg-secondary text-tertiary p-4 rounded-lg shadow-lg">
                  <p className="font-bold text-xl">20+</p>
                  <p className="text-sm">Professional Photographers</p>
                </div>
              </div>
            </motion.div> */}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;