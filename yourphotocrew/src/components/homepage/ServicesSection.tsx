import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Calendar, Camera, Image, Users, DollarSign, Palette, Waves } from 'lucide-react';

const ServicesSection: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [activeTab, setActiveTab] = useState(0);

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

  const services = [
    {
      title: 'Scheduled Shoot',
      icon: <Users className="w-6 h-6" />,
      description: 'Pre-booked, theme-based shoot at partnered locations for high-quality, personalized portraits.',
      image: 'assets/homepage/scheduled-shoot.mp4',
      bullets: [
        "Feeling awkward posing in public or struggling to get natural, candid shots in private?",
        "Prefer capturing intimate moments in a private setting—whether for an anniversary, golden/silver jubilee, or a beautiful relationship reveal?",
        "Uncomfortable posing in public or run out of poses mid-shoot?",
        "Wish you had a perfectly curated wardrobe to enhance your photos and reflect your style effortlessly?",
        "Going through a breakup or life shift and want portraits that reflect your resilience and strengths?",
        "Want professional shots to showcase your transformation, fitness journey, or statement fashion choices?",
        "Need a polished persona—corporate, influencer, or branding—with a pro crew at premium venues?",
        "Want a standout portfolio for Instagram, LinkedIn, dating, or matrimony—but taking photos every time you hangout just isn’t you?"

      ],
    },
    {
      title: 'Goa edition - Scheduled Shoot',
      icon: <Waves className="w-6 h-6" />,
      description: 'Capture your Goa memories with high-quality, candid shots so that you can finally do what you came to do… travel',
      image: 'assets/homepage/goa.mp4',
      bullets: [
       "Out with or without your friends or on your honeymoon? This trip is special. One picture might be all that lasts—let’s make it the one we take!",
       "Perfect Goa look—beachwear, resort outfits, boho styles—but no great pictures to show for it?",
       "Ever wondered how much better pro shots are than ‘that’ friend with his phone? Capture high-quality, candid moments on Goa’s beautiful beaches—so you can enjoy the trip without clicking nonstop!"

      ]
    },
    {
      title: 'College Fests',
      icon: <Image className="w-6 h-6" />,
      description: 'On-demand photography at college fests — quick, high-quality shots at half the price.',
      image: 'assets/homepage/collegeshoot.mp4',
      bullets: [
        "Ever been lost in a memory lane just scrolling your gallery, 1 pic after the other and you’ll get why those Harry Potter portraits moved for a reason.Coz it’s never just a still.. its years of fun college memories surrounding it & once you look back… don’t they all come rushing in? If this was your Hogwarts, we'll come click where a frame of your group should ideally belong..at your hangout spot.",
        "Curious about the process? Drop by, check the quality, and if it’s not for you, you’re even free to leave mid-shoot.",
        "Unbeatable pricing—just ₹300 per session, half the Scheduled Shoot price, designed for college students.",
        "Do you value spontaneity—those unplanned, real moments that define your college experience? The inside jokes, the late-night hangouts, the memories that deserve more than just blurry phone clicks?",
        "Prefer getting clicked in the comfort of your own college instead of traveling to a shoot location?",
        "By the time you graduate, you won’t look like the ‘you’ who just started college. Let our clicks take you back—whether it’s with friends, your partner, or solo."
      ]
    },
    {
      title: 'Family Functions',
      icon: <Camera className="w-6 h-6" />,
      description: 'Personalized photography at family events — focused on you, not just the event.',
      image: 'assets/homepage/family.jpg',
      bullets: [
        "At weddings and family events, the photographer’s job is to cover the event—not you. They’ll snap a quick shot, mid-bite or mid-adjustment, and move on. It’s about quantity, not capturing you at your best.",
        "We’re different. We’re not there for the event — we’re there for you. We’ll focus on well-dressed guests, spending dedicated time and effort to get the perfect shot you’re looking for. It’s not about quick snaps — it’s about giving you the kind of personalized attention that regular event photography can’t.",
        "We’re invited by organizers, with two payment options—covered by them or directly by you (₹300 per session).",
        "You’ve put in the effort to look your best— let’s make sure you have the perfect photos to show for it.",
        "What’s more comfortable than getting clicked among family? If this event is personal to you, wouldn’t it make sense to have a personal photographer capturing those candid, meaningful moments as you move around the event grounds?",
        "For organizers, quantity matters—covering every moment to preserve the memory. But for guests to truly cherish their photos for years, quality is everything. A great event stays in memory, but a great photo keeps it alive."
      ]
    },
    // {
    //   title: 'Street Photography',
    //   icon: <Palette className="w-6 h-6" />,
    //   description: 'Urban photoshoots that capture the energy and character of city streets.',
    //   image: 'https://images.unsplash.com/photo-1551854716-8b811be39e7e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1631&q=80',
    // },
  ];

  return (
    <section id="services" className="py-20 bg-quaternary">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">What We Offer</h2>
            <div className="w-20 h-1 bg-secondary mx-auto mb-6"></div>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
              From dating profiles to portfolio shoots, we offer a variety of themes to suit your needs.
            </p>
          </motion.div>

          {/* <motion.div variants={itemVariants} className="mb-12">
            <div className="bg-tertiary p-6 rounded-lg shadow-lg">
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center bg-secondary-light p-4 rounded-lg">
                  <DollarSign className="w-6 h-6 text-secondary mr-2" />
                  <span className="text-primary font-medium">Rs 500/theme on weekdays</span>
                </div>
                <div className="flex items-center bg-secondary-light p-4 rounded-lg">
                  <DollarSign className="w-6 h-6 text-secondary mr-2" />
                  <span className="text-primary font-medium">Rs 600/theme on weekends</span>
                </div>
                <div className="flex items-center bg-secondary-light p-4 rounded-lg">
                  <Calendar className="w-6 h-6 text-secondary mr-2" />
                  <span className="text-primary font-medium">Multiple themes available</span>
                </div>
              </div>
            </div>
          </motion.div> */}

          <motion.div variants={itemVariants} className="mb-12">
            <div className="flex overflow-x-auto pb-2 mb-6 scrollbar-hide">
              <div className="flex space-x-2">
                {services.map((service, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTab(index)}
                    className={`px-6 py-3 rounded-full whitespace-nowrap transition-all duration-300 ${
                      activeTab === index
                        ? 'bg-secondary text-tertiary'
                        : 'bg-tertiary text-primary hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">{service.icon}</span>
                      <span className="font-medium">{service.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-start">
              <div className="overflow-hidden rounded-lg">
                {services[activeTab].image.includes('.mp4') ? (
                  <video
                    src={services[activeTab].image}
                    autoPlay
                    loop
                    muted
                    className="w-full transition-transform duration-500 hover:scale-105 overflow-hidden aspect-square object-cover"
                  />
                ) : (
                <img
                  src={services[activeTab].image}
                  alt={services[activeTab].title}
                  className="w-full h-80 object-cover transition-transform duration-500 hover:scale-105"
                />)}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-primary mb-4">{services[activeTab].title}</h3>
                <p className="text-gray-700 mb-6">{services[activeTab].description}</p>
                <ul className="space-y-3 mb-6">
                  {services[activeTab].bullets?.map((bullet, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-secondary mr-2">✓</span>
                      <span className="text-primary">{bullet}</span>
                    </li>
                  ))}
                </ul>
                
                {/* <a
                  href="#contact"
                  className="inline-block bg-secondary text-tertiary px-6 py-3 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
                >
                  Book This Service
                </a> */}
              </div>
            </div>
          </motion.div>

          {/* <motion.div variants={itemVariants} className="text-center">
            <a
              href="#contact"
              className="inline-block bg-primary text-tertiary px-8 py-4 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
            >
              Explore All Services
            </a>
          </motion.div> */}
        </motion.div>
      </div>
    </section>
  );
};

export default ServicesSection;