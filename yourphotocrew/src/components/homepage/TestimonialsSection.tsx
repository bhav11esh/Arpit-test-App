import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: '400', 
});

const TestimonialsSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

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

  const testimonials = [
    {
      text: "I had an amazing experience during my recent photo shoot! The photographer and the team was incredibly professional, making me feel comfortable and confident throughout the session. They had a fantastic eye for detail and captured beautiful moments that truly reflect my personality. The turnaround time for the photos was quick, and the final images exceeded my expectations. I highly recommend this service to anyone looking to capture special memories. I can't wait to book another shoot!",
      name: "Mohit Raj Pal",
      role: "",
      image: "",
    },
    {
      text: "These guys were doing street photography content & they approached me on the road photoshoot happened...the shots were breathtaking. If you're looking for creative ideas, this is the right place to find a photographer near me who can deliver stunning results.",
      name: "Sneha Biradarpatil",
      role: "",
      image: "",
    },
    {
      text: "Awesome one! They have a wide collection of dress both upper and lower in varying sizes and suggest the best for us based on our body psyche and theme. The person always tells us the best poses and keep on entertaining us and the photographer clicks the best of the candids! Overall a great experience, and would recommend anyone to jump in!",
      name: "Abhishek Ray",
      role: "",
      image: "",
    },
    {
      text: "I had an amazing experience working with Them! Their professionalism, creativity, and attention to detail truly set them apart. They made the entire process comfortable and fun, capturing stunning shots that exceeded my expectations. The final images were beautifully edited and delivered on time. If you're looking for a talented photographer who brings out the best in every moment, I highly recommend.",
      name: "Roshan Choudhary",
      role: "",
      image: "",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === testimonials.length - 1 ? 0 : prev + 1));
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === 0 ? testimonials.length - 1 : prev - 1));
  };

  return (
    <section id="testimonials" className="py-20 bg-quaternary">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">What Our Clients Say</h2>
            <div className="w-20 h-1 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
              Don't just take our word for it – hear from our happy clients!
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="relative">
            <div className="bg-tertiary rounded-lg shadow-lg p-6 md:p-10 mb-8">
              <Quote className="w-16 h-16 text-secondary opacity-20 absolute top-8 left-8" />
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  {/* <div className="w-24 h-24 rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src={testimonials[currentTestimonial].image}
                      alt={testimonials[currentTestimonial].name}
                      className="w-full h-full object-cover"
                    />
                  </div> */}
                  <div className="flex-1">
                    <p className="text-lg md:text-xl text-gray-700 italic mb-6">
                      "{testimonials[currentTestimonial].text}"
                    </p>
                    <div>
                      <h4 className="text-xl font-semibold text-primary">
                        {testimonials[currentTestimonial].name}
                      </h4>
                      <p className="text-gray-600">{testimonials[currentTestimonial].role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={prevTestimonial}
                className="bg-tertiary text-primary p-2 rounded-full shadow hover:bg-gray-100 transition-all duration-300"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex space-x-2 items-center">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      currentTestimonial === index ? 'bg-secondary w-6' : 'bg-gray-300'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
              <button
                onClick={nextTestimonial}
                className="bg-tertiary text-primary p-2 rounded-full shadow hover:bg-gray-100 transition-all duration-300"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="text-center mt-12">
            <a
              href="https://tinyurl.com/mttep9sm"
              target="_blank"
              className="inline-block bg-secondary text-tertiary px-6 py-3 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
            >
              Read Google Reviews
            </a>
          </motion.div>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="text-center mt-12"
        >
          <div className="bg-tertiary rounded-lg shadow-lg p-6 md:p-10 mb-8">
            <p className={`${dancingScript.className} text-lg md:text-xl text-gray-700 italic mb-6`}>We don't use your photos for marketing without prior consent. We here at yourphotocrew respect your privacy</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TestimonialsSection;