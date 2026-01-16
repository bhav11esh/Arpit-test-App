import React, { useState } from 'react';

const PhotoGrid = () => {
  const [activeMobileImage, setActiveMobileImage] = useState(0);

  const mobileImages = [
    { src: "assets/gallery/male/male-1.jpg", alt: "Male portrait", className: "w-full h-full" },
    { src: "assets/gallery/couple/couple-1.jpg", alt: "Couple portrait", className: "w-1/2 h-1/2" },
    { src: "assets/gallery/female/female-1.jpg", alt: "Female portrait", className: "w-1/3 h-1/3" },
    { src: "assets/gallery/businessprofile/businessprofile-2.jpg", alt: "Business profile", className: "w-1/2 h-1/2" }
  ];

  const rotateValues = ["rotate-2", "-rotate-1", "rotate-1", "-rotate-2"];

  return (
    <div className="self-stretch min-w-60 w-[435px] my-auto max-md:w-full">
      {/* Desktop View - Original Grid Layout */}
      <div className="hidden md:block rounded-[150px]">
        {/* First Row */}
        <div className="gap-5 flex">
          <div className="w-3/5">
            <img
              loading="lazy"
              srcSet="assets/homescheduled/bus-2.jpg"
              className="aspect-[1.42] object-cover w-full rounded-[150px] hover:scale-105 transition-transform duration-500 ease-in-out animate-float"
              alt="Male portrait"
            />
          </div>
          <div className="w-2/5 ml-5">
            <img
              loading="lazy"
              srcSet="assets/gallery/couple/couple-2.jpg"
              className="aspect-[0.94] object-cover w-full rounded-[150px] hover:scale-105 transition-transform duration-500 ease-in-out animate-float-delay"
              alt="Couple portrait"
            />
          </div>
        </div>

        {/* Second Row */}
        <div className="gap-5 flex mt-5">
          <div className="w-2/5">
            <img
              loading="lazy"
              srcSet="assets/homescheduled/female-2.jpg"
              className="aspect-[1] object-cover w-full rounded-[150px] hover:scale-105 transition-transform duration-500 ease-in-out animate-float-delay-2"
              alt="Female portrait"
            />
          </div>
          <div className="w-3/5 ml-5">
            <img
              loading="lazy"
              srcSet="assets/homescheduled/male-2.jpg"
              className="aspect-[1.52] object-cover w-full rounded-[150px] hover:scale-105 transition-transform duration-500 ease-in-out animate-float"
              alt="Business profile"
            />
          </div>
        </div>

        {/* Third Row */}
        <div className="gap-5 flex mt-5">
          <div className="w-2/5">
            <img
              loading="lazy"
              srcSet="assets/homescheduled/female-4.jpg"
              className="aspect-[1] object-cover w-full rounded-[150px] hover:scale-105 transition-transform duration-500 ease-in-out animate-float"
              alt="Female portrait 2"
            />
          </div>
          <div className="w-[30%] ml-5">
            <img
              loading="lazy"
              srcSet="assets/homescheduled/male-9.jpg"
              className="aspect-[0.76] object-cover w-full rounded-[150px] hover:scale-105 transition-transform duration-500 ease-in-out animate-float-delay"
              alt="Couple portrait 2"
            />
          </div>
          <div className="w-[30%] ml-5">
            <img
              loading="lazy"
              srcSet="assets/homescheduled/male-7.jpg"
              className="aspect-[0.76] object-cover w-full rounded-[150px] hover:scale-105 transition-transform duration-500 ease-in-out animate-float-delay-2"
              alt="Male portrait 2"
            />
          </div>
        </div>
      </div>

      {/* Mobile View - Interactive Collage */}
      <div className="md:hidden relative h-[70vh] w-full rounded-2xl overflow-hidden bg-gray-100">
        {/* Main featured image */}
        <img
          src={mobileImages[activeMobileImage].src}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${activeMobileImage === 0 ? 'z-10' : 'z-0'}`}
          alt={mobileImages[activeMobileImage].alt}
        />

        {/* Smaller interactive images positioned around */}
        {mobileImages.map((img, index) => (
          index !== activeMobileImage && (
            <div
              key={index}
              className={`absolute ${index === 1 ? 'bottom-4 left-4' : index === 2 ? 'top-4 right-4' : 'bottom-8 right-8'} 
                          ${mobileImages[index].className} rounded-xl overflow-hidden shadow-lg cursor-pointer 
                          transition-transform duration-300 hover:scale-110 z-20 ${rotateValues[index]}`}
              onClick={() => setActiveMobileImage(index)}
            >
              <img
                src={img.src}
                className="w-full h-full object-cover"
                alt={img.alt}
              />
            </div>
          )
        ))}

        {/* Navigation dots */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
          {mobileImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveMobileImage(index)}
              className={`w-2 h-2 rounded-full ${index === activeMobileImage ? 'bg-white' : 'bg-white/50'}`}
              aria-label={`View image ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhotoGrid;