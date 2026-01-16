import React from "react";
import {
  Camera,
  Instagram,
  Youtube,
  MessageCircle,
  ChevronRight,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-tertiary">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <img
                src="assets/logo.jpg"
                alt="YourPhotoCrew"
                className="h-12 w-12"
              />
              <span className="font-bold text-xl">YourPhotoCrew</span>
            </div>
            <p className="text-gray-400 mb-6">
              Making high-quality candid photoshoots accessible and fun for
              everyone since 2023.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/yourphotocrew/"
                target="_blank"
                className="text-gray-400 hover:text-secondary transition-colors duration-300"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <a
                href="https://www.youtube.com/@yourphotocrew"
                target="_blank"
                className="text-gray-400 hover:text-secondary transition-colors duration-300"
                aria-label="YouTube"
              >
                <Youtube className="h-6 w-6" />
              </a>
              <a
                href="https://wa.me/7676235229"
                target="_blank"
                className="text-gray-400 hover:text-secondary transition-colors duration-300"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-6">Quick Links</h3>
            <ul className="space-y-4">
              {[
                { name: "Home", route: "/" },
                { name: "Scheduled Services", route: "/services" },
                { name: "Gallery", route: "/gallery" },
                { name: "Live Booking", route: "/live-booking" },
              ].map((item) => (
                <li key={item}>
                  <a
                    href={item.route}
                    className="text-gray-400 hover:text-secondary transition-colors duration-300 flex items-center"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* <div>
            <h3 className="text-lg font-semibold mb-6">Services</h3>
            <ul className="space-y-4">
              {[
                "Dating Profile Shoots",
                "Portfolio Shoots",
                "Cafe Photoshoots",
                "Street Photography",
                "Business Photoshoots",
              ].map((item) => (
                <li key={item}>
                  <a
                    href="#services"
                    className="text-gray-400 hover:text-secondary transition-colors duration-300 flex items-center"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div> */}

          <div>
            <h3 className="text-lg font-semibold mb-6">Contact Us</h3>
            <ul className="space-y-4 text-gray-400">
              <li>
                <p>53/24, Saryu Marg, Manasarovar,</p>
                <p>Jaipur, Rajasthan 302020</p>
              </li>
              <li>
                <p>Phone: +91 9608310344</p>
              </li>
              {/* <li>
                <p>Email: info@yourphotocrew.com</p>
              </li> */}
              <li>
                <p>Hours: 11AM-6PM, 7 days a week</p>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2025 YourPhotoCrew. All rights reserved.
            </p>
            {/* <div className="flex space-x-6">
              <a
                href="#"
                className="text-gray-400 hover:text-secondary text-sm transition-colors duration-300"
              >
                Privacy Policy
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-secondary text-sm transition-colors duration-300"
              >
                Terms of Service
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-secondary text-sm transition-colors duration-300"
              >
                Cookie Policy
              </a>
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
