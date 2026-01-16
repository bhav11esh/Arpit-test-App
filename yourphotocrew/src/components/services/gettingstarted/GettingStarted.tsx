"use client";

import { redirect } from "next/dist/server/api-utils";
import { ActionButton } from "./ActionButton";
import { motion } from "framer-motion";
import Link from "next/link";

const steps = [
  {
    number: 1,
    title: "Book Your Slot",
    content: "Choose between online platforms (BookMyShow, PayTM, Insider) with full prepayment or direct booking at cheaper rates via WhatsApp with just Rs 300 pre-booking (adjusted later).",
  },
  {
    number: 2,
    title: "Arrive On Time",
    content: "From your smile/laugh while you get clicked to your wardrobe to planning themes everything will be our responsibility. All you need to do is show up!",
  },
  {
    number: 3,
    title: "Seamless Venue Experience",
    content: "All of our partnered themes are are equipped with wardrobe changing facilities & within walking distances. So, you don’t have to worry about transportation costs.",
  },
  {
    number: 4,
    title: "Receive Your Photos",
    content: "Get the entire camera roll via Google Drive by the end of the shoot day.",
  },
  {
    number: 5,
    title: "Select & Get Edits",
    content: "Share your preferred filenames for editing, and receive polished photos within 3 days.",
  },
];

export const GettingStarted = () => {
  const handleBookClick = () => {
    return (
      <Link href="/services">
        <a>Book Now</a>
      </Link>
    );
  };

  return (
    <section className="relative py-20 px-6 lg:px-8 overflow-hidden min-h-[600px] flex items-center">
      {/* Background Image with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          loading="lazy"
          src="assets/services/gettingstarted/image-7.jpg"
          className="w-full h-full object-cover object-center"
          alt="Photoshoot background"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
      </div>

      {/* Content - Left aligned */}
      <div className="relative max-w-4xl mx-auto z-10 w-full">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-12 text-left"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            Getting started is easy
          </h1>
          <p className="text-xl text-white/90">
            Follow these simple steps to book your perfect photoshoot experience
          </p>
        </motion.div>

        {/* Steps - Left aligned with better number styling */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="space-y-6 max-w-2xl"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.2,
              },
            },
          }}
        >
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              className="flex items-start gap-4"
              variants={{
                hidden: { x: -20, opacity: 0 },
                visible: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    duration: 0.5,
                  },
                },
              }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/50">
                <span className="text-white text-lg font-bold">{step.number}</span>
              </div>
              <div className="text-white">
                <h3 className="text-xl font-semibold mb-1">{step.title}</h3>
                <p className="text-white/90">{step.content}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          viewport={{ once: true }}
          className="mt-12 text-left"
        >
          <ActionButton 
            text="Book Your Shoot Now" 
            onClick={() => window.location.href = '/services'}
            className="px-8 py-3 text-lg font-medium hover:scale-105 transition-transform bg-white text-black hover:bg-white/90"
          />
        </motion.div>
      </div>
    </section>
  );
};

export default GettingStarted;