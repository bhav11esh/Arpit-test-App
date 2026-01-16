import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, DollarSign, MapPin, CheckCircle } from 'lucide-react';

const BrandUspSection: React.FC = () => {
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

  const uspItems = [
    {
      icon: <Users className="w-12 h-12 text-secondary" />,
      title: "Process tailored for Candidness",
      description: "Veteran Photographers along with dedicated assistants to help with poses, smiles & wardrobe suggestions",
    },
    {
      icon: <MapPin className="w-12 h-12 text-secondary" />,
      title: "Partnered with a variety of Venue types",
      description: "We service a whole range of themes like gyms, cafes, pubs, nature, dining, street photography, bike, nature park, footbridge etc.",
    },
    {
      icon: <DollarSign className="w-12 h-12 text-secondary" />,
      title: "Affordable Pricing",
      description: "Yes you read it right. Our pricing is missing a few zeroes!",
    },
    {
      icon: <CheckCircle className="w-12 h-12 text-secondary" />,
      title: "Quality Assurance",
      description: "We don't move to the next theme until YOU say there are at least 2 great clicks in any theme.",
    },
  ];

  return (
    <section id="brand-usp" className="py-20 bg-tertiary">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Why Choose Us</h2>
            <div className="w-20 h-1 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
              Here's why we are, exactly who you need!
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {uspItems.map((item, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-quaternary p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col md:flex-row items-start gap-6"
              >
                <div className="bg-tertiary p-4 rounded-full shadow-md">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary mb-3">{item.title}</h3>
                  {item.description && (
                    <p className="text-gray-700">{item.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* <motion.div variants={itemVariants} className="text-center mt-16">
            <a
              href="#services"
              className="inline-block bg-secondary text-tertiary px-8 py-4 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
            >
              Explore Our Services
            </a>
          </motion.div> */}
        </motion.div>
      </div>
    </section>
  );
};

export default BrandUspSection;