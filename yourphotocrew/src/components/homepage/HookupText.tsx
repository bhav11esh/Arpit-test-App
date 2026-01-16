import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const HookupText: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const animationComplete = useRef(false);

  const hookupText =
    "Our goal is to make high-quality candid photoshoots accessible to the average middle class. Our aim is to be the digital version of the same 'physical album' which our parents/grandparents used to have with a bunch of timeless clicks. We operate such that all you have to say is yes & the rest is taken care of. We go above & beyond to ensure that every shoot is a success.";

  const letters = hookupText.split("");

  const getLetterStyle = (index: number) => {
    const start = index / letters.length;
    const end = (index + 8) / letters.length;

    const opacity = Math.min(1, Math.max(0.3, (progress - start) / (end - start)));
    const fontWeight = 300 + (Math.min(Math.max(progress - start, 0), 1) * 500);

    return {
      opacity,
      fontWeight: `${fontWeight}`,
      display: 'inline-block',
      whiteSpace: 'pre-wrap'
    };
  };

  useEffect(() => {
    const container = containerRef.current;

    const handleWheel = (e: WheelEvent) => {
      if (!isActive || animationComplete.current) return;
      
      e.preventDefault();
      
      setProgress(prev => {
        const newProgress = Math.min(1, prev + e.deltaY * 0.0005);
        return newProgress;
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animationComplete.current) {
          setIsActive(true);
          document.body.style.overflow = "hidden";
        }
      },
      { threshold: 0.5 }
    );

    if (container) {
      observer.observe(container);
      window.addEventListener("wheel", handleWheel, { passive: false });
    }

    return () => {
      if (container) observer.unobserve(container);
      window.removeEventListener("wheel", handleWheel);
      document.body.style.overflow = "auto";
    };
  }, [isActive]);

  useEffect(() => {
    if (progress >= 1 && !animationComplete.current) {
      animationComplete.current = true;
      setIsActive(false);
      document.body.style.overflow = "auto";
    }
  }, [progress]);

  return (
    <section 
      ref={containerRef} 
      className="w-full h-[100vh] flex items-center justify-center bg-white sticky top-0"
    >
      <div className="max-w-4xl px-6">
        <p className="text-lg md:text-xl font-light text-justify leading-relaxed text-[#181818]">
          {letters.map((letter, index) => (
            <motion.span
              key={index}
              style={getLetterStyle(index)}
            >
              {letter}
            </motion.span>
          ))}
        </p>
      </div>
    </section>
  );
};

export default HookupText;