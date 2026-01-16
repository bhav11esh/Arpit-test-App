import React, { use } from "react";
import PhotoGrid from "./PhotoGrid";
import SocialLinks from "./SocialLinks";
import { useState, useEffect } from "react";

const ScheduledShoot = () => {
    const [dynamicHeadingIndex, setDynamicHeadingIndex] = useState(0);
    const dynamicHeading = [
        "Yes, our prices are missing a few zeros!",
        "Tailored for First Timers",
        "Camera shy? Out of poses? Don’t worry..."];
    useEffect(() => {
        const interval = setInterval(()=>{
            setDynamicHeadingIndex((prev) => (prev === dynamicHeading.length - 1 ? 0 : prev + 1));
        }, 3000);
        return () => clearInterval(interval);
    }, [dynamicHeading.length]);


  return (
    <section className="mt-16 mb-16 p-16 bg-[rgba(248,242,235,1)] overflow-hidden px-[60px] pt-14 rounded-[30px] max-md:px-5">
      <div className="flex flex-col md:flex-row gap-10 max-md:items-stretch">
        {/* Left Side Content */}
        <div className="flex flex-col w-full md:w-[60%] max-md:order-2">
          <div className="text-black">
            <h1 className="text-5xl font-bold leading-none max-md:text-[40px]">
                {dynamicHeading[dynamicHeadingIndex]}
            </h1>
            <p className="text-xl font-normal leading-[30px] mt-[22px]">
              We hire someone to make you laugh and pose while we capture the
              perfect shot. Photoshoots are done by veterans at exclusive
              locations with no bystanders. From gyms to cafes to street
              photography, our partnered venues offer endless options to match
              your style. Enjoy a personalized experience with access to our
              wardrobe and venues that bring out the real YOU!
            </p>
          </div>
          <div className="mt-10">
            <SocialLinks />
          </div>
        </div>

        {/* Right Side PhotoGrid */}
        {/* <div className="w-full md:w-[40%] max-md:order-1">
          <PhotoGrid />
        </div> */}
        <div className="w-full md:w-[40%] flex justify-center items-center camera-love-animate-fade-in-left">
        <div className="relative w-full max-w-[400px] h-[600px] rounded-[30px] overflow-hidden shadow-2xl">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source
              src="assets/services/cameralovesection/reel-video.mp4"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>
      </div>
      </div>
    </section>
  );
};

export default ScheduledShoot;
