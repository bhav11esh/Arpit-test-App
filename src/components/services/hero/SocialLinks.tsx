import React, { useEffect, useState } from 'react';

const SocialLinks = () => {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`${
        isSticky
          ? 'fixed bottom-0 left-0 w-full bg-primary shadow-lg z-50 animate-slide-up flex items-center justify-center md:justify-start h-16 md:h-20'
          : 'flex flex-col items-center justify-center relative mt-10 md:mt-12 py-4 md:py-6'
      } transition-all duration-300 px-4 sm:px-6 md:px-8`}
    >
      {/* Title - hidden when sticky */}
      {!isSticky && (
        <div className="text-black text-lg md:text-xl font-semibold mb-2 md:mb-4">
          Book Your Tickets
        </div>
      )}

      {/* Buttons Container */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8">
        {/* Paytm Insider Button */}
        <a
          href="https://www.district.in/professional-photoshoot-come-get-that-pic-jun23-2024/event"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          <button
            className={`${
              isSticky ? 'w-20 h-10 md:w-24 md:h-12' : 'w-28 h-14 md:w-36 md:h-20'
            } group relative flex items-center justify-center bg-tertiary rounded-md shadow-lg hover:scale-105 active:scale-95 transition-transform`}
          >
            <img
              src="assets/homepage/paytm-insider.svg"
              alt="Paytm Insider Logo"
              className={`${
                isSticky ? 'w-12 md:w-16' : 'w-20 md:w-28'
              } transition-transform`}
            />
          </button>
        </a>

        {/* BookMyShow Button */}
        <a
          href="https://in.bookmyshow.com/events/professional-photoshoot-come-get-that-pic/ET00401389"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          <button
            className={`${
              isSticky ? 'w-20 h-10 md:w-24 md:h-12' : 'w-28 h-14 md:w-36 md:h-20'
            } group relative bg-tertiary flex items-center justify-center rounded-md shadow-lg hover:scale-105 active:scale-95 transition-transform`}
          >
            <img
              src="assets/homepage/bookmyshow-logo.svg"
              alt="BookMyShow Logo"
              className={`${
                isSticky ? 'w-12 md:w-16' : 'w-20 md:w-28'
              } transition-transform`}
            />
          </button>
        </a>

        {/* WhatsApp Button */}
        <a
          href="https://wa.me/7676235229"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          <button
            className={`${
              isSticky ? 'h-10 md:h-12 px-2 md:px-3' : 'h-14 md:h-20 px-3 md:px-4'
            } group relative bg-tertiary flex items-center justify-center rounded-md shadow-lg hover:scale-105 active:scale-95 transition-transform gap-1 md:gap-2`}
          >
            <img
              src="assets/homepage/whatsapp.svg"
              alt="WhatsApp Logo"
              className={`${
                isSticky ? 'w-5 md:w-6' : 'w-8 md:w-10'
              } transition-transform`}
            />
            <p
              className={`${
                isSticky ? 'text-xs md:text-sm' : 'text-sm md:text-base'
              } text-primary font-medium md:font-semibold whitespace-nowrap`}
            >
              Cheaper & No Prepayment!
            </p>
          </button>
        </a>
      </div>
    </div>
  );
};

export default SocialLinks;