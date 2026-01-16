import React, { useState, useEffect } from "react";

export const GlimpseGallery: React.FC = () => {
  const images = [
    "assets/homescheduled/male-4.jpg",
    "assets/homescheduled/female-5.jpg",
    "assets/homescheduled/bus-4.jpg",
    "assets/homescheduled/male-5.jpg",
    "assets/homescheduled/female-6.jpg",
    "assets/homescheduled/male-12.jpg",
    "assets/homescheduled/male-11.jpg",
    "assets/gallery/couple/couple-6.jpg",
  ];

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative overflow-hidden py-16 px-4 sm:px-6 lg:px-8 bg-quaternary">
      <div className="max-w-7xl mx-auto">
        {/* Header with animation */}
        <div className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            <span className="relative inline-block">
              <span className="relative z-10">Get a Glimpse of Our Work</span>
              <div className="w-20 h-1 bg-secondary mx-auto mb-6 mt-8"></div>
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Think photoshoots are only for models or influencers? Think again. 
            Here's why stepping in front of the camera could be one of the best 
            things you do for yourself.
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="relative">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {images.map((image, index) => (
              <div 
                key={index}
                className={`relative aspect-square overflow-hidden rounded-xl transition-all duration-500 ease-in-out ${hoveredIndex === null || hoveredIndex === index ? 'opacity-100' : 'opacity-70'}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  transform: hoveredIndex === index ? 'scale(1.03)' : 'scale(1)',
                  boxShadow: hoveredIndex === index ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : 'none'
                }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-110"
                  style={{ backgroundImage: `url(${image})` }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                  {hoveredIndex === index && (
                    <svg className="w-12 h-12 text-white opacity-0 animate-fadeIn" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* View More Button */}
          <div className="text-center mt-12">
            <a 
              href="/gallery" 
              className="inline-flex items-center px-8 py-4 bg-primary text-white rounded-full font-medium transition-all duration-300 hover:bg-secondary hover:shadow-lg hover:-translate-y-1"
            >
              View Our Gallery
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
    </section>
  );
};

export default GlimpseGallery;