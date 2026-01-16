import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Instagram, Camera, Heart, Smile, Users, Play, Pause, ChevronRight } from 'lucide-react';

const BtsSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [activeDoubt, setActiveDoubt] = useState(0);

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

  const doubts = [
    "About quality?",
    "What will the process be like in person?",
    "Are the crew friendly?",
    "Is it going to be awkward... I've never done anything like this before?",
    "I'm not someone good with poses. I get camera shy..."
  ];

  // Auto-rotate doubts
  React.useEffect(() => {
    const timer = setInterval(() => {
      setActiveDoubt((prev) => (prev + 1) % doubts.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [doubts.length]);

  return (
    <section className="py-20 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Behind The Scenes</h2>
            <div className="w-20 h-1 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700">
            All first-timers have a similar journey with us.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left column - Content */}
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="bg-tertiary rounded-2xl p-8 shadow-lg">
                <h3 className="text-2xl font-bold text-primary mb-6">
                  The First-Timer Experience
                </h3>
                <p className="text-gray-700 mb-8"> 
                  We exclusively click first-timers. The very first minute, 
                  the feeling of anxiety
                </p>
                
                {/* All doubts visible but one highlighted */}
                <div className="space-y-4 mb-8">
                  {doubts.map((doubt, index) => (
                    <motion.div
                      key={index}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                        activeDoubt === index ? 'bg-secondary/10 text-primary' : 'text-gray-500'
                      }`}
                    >
                      <ChevronRight 
                        className={`w-5 h-5 ${
                          activeDoubt === index ? 'text-secondary' : 'text-gray-400'
                        }`} 
                      />
                      <span className={`${
                        activeDoubt === index ? 'font-medium' : ''
                      }`}>
                        {doubt}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <Smile className="w-8 h-8 text-secondary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-primary mb-2">
                        ALL THESE DOUBTS FADE AWAY IN THE VERY NEXT 5 MIN...
                      </h4>
                      <p className="text-gray-700 mb-4">
                        COME SEE IT FOR YOURSELF even just as a viewer. WE HIRE A SHOOT 'FRIEND' 
                        TAILORING THE PROCESS FOR A FIRST TIMER.
                      </p>
                      {/* <motion.a
                        href="https://www.instagram.com/yourphotocrew"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-secondary hover:text-secondary/80 transition-colors duration-300"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Instagram className="w-5 h-5" />
                        <span className="font-medium">Watch More BTS Reels</span>
                      </motion.a> */}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right column - Video */}
            <motion.div
              variants={itemVariants}
              className="relative mx-auto w-full max-w-[350px]"
            >
              <motion.div
                className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${
                  isVideoExpanded ? 'fixed inset-4 z-50 bg-black' : ''
                }`}
                layoutId="video-container"
              >
                <div className={`${
                  isVideoExpanded 
                    ? 'h-full w-full flex items-center justify-center'
                    : 'aspect-[9/16] bg-gray-900'
                }`}>
                  <video
  className={`w-full h-full rounded-2xl ${isVideoExpanded ? 'max-w-[calc(100vh*9/16)]' : ''}`}
  autoPlay
  muted
  loop
  playsInline
>
  <source src="assets/services/cameralovesection/reel-video.mp4" type="video/mp4" />
  Your browser does not support the video tag.
</video>
                </div>
                <button
                  onClick={() => setIsVideoExpanded(!isVideoExpanded)}
                  className="absolute bottom-4 right-4 bg-secondary text-white p-3 rounded-full shadow-lg hover:bg-opacity-90 transition-all duration-300"
                >
                  {isVideoExpanded ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                
                {/* Video overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50 pointer-events-none" />
                
                {/* Video stats */}
                <div className="absolute bottom-4 left-4 flex items-center space-x-4 text-white text-sm">
                  <div className="flex items-center">
                    <Heart className="w-4 h-4 mr-1" />
                    <span>2.4k</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    <span>12k</span>
                  </div>
                </div>
              </motion.div>
              
              {isVideoExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black bg-opacity-75 z-40"
                  onClick={() => setIsVideoExpanded(false)}
                />
              )}
              <motion.a
                href="https://www.instagram.com/reel/DGAvzPty6xi/"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-secondary text-tertiary p-4 rounded-xl text-center hover:bg-opacity-90 transition-all duration-300 mt-6"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Instagram className="w-8 h-8 mx-auto mb-2" />
                <span className="font-medium">Watch More BTS Reels</span>
              </motion.a>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BtsSection;