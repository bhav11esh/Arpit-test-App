import React, { useState, useEffect } from "react";
import { Camera, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";

const Navbar = () => {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [{ name: "Home", route: "/" }, { name: "Scheduled Services", route: "/services" }, { name: "Gallery", route: "/gallery" }, { name: "Live Booking", route: "/live-booking" }];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-primary shadow-lg py-2" : "bg-primary py-4"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center">
          <a href="#" className="flex items-center space-x-2">
            <img
              src="assets/logo.jpg"
              alt="YourPhotoCrew"
              className="h-12 w-12"
            />
            <span
              className={`font-bold text-xl ${
                isScrolled ? "text-tertiary" : "text-tertiary"
              }`}
            >
              YourPhotoCrew
            </span>
          </a>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const route = item.name === "Home" ? "/" : `/${item.route.toLowerCase()}`; // Redirect to '/' for Home
              const isActive = router.pathname === route;

              return (
                <Link
                  key={item}
                  href={route}
                  className={`${
                    isActive
                      ? "text-secondary"
                      : "text-tertiary hover:text-secondary"
                  } font-medium transition-colors duration-300`}
                >
                  {item.name}
                </Link>
              );
            })}
            {/* <Link
              href="/contact"
              className="bg-secondary text-tertiary px-4 py-2 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300"
            >
              Book Now
            </Link> */}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-tertiary focus:outline-none"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-primary shadow-lg transition-all duration-300 ease-in-out ${
          isMenuOpen
            ? "max-h-screen opacity-100"
            : "max-h-0 opacity-0 pointer-events-none"
        } overflow-hidden`}
      >
        <div className="container mx-auto px-4 py-4 flex flex-col space-y-4 bg-secondary">
          {navItems.map((item) => {
            const route = item.name === "Home" ? "/" : `/${item.route.toLowerCase()}`; // Redirect to '/' for Home
            const isActive = router.pathname === route;

            return (
              <Link
                key={item}
                href={route}
                className={`${
                  isActive
                    ? "text-primary"
                    : "text-tertiary hover:text-primary"
                } font-medium transition-colors duration-300`}
                onClick={() => setIsMenuOpen(false)} // Close menu on click
              >
                {item.name}
              </Link>
            );
          })}
          {/* <Link
            href="/contact"
            className="bg-secondary text-tertiary px-4 py-2 rounded-full font-medium hover:bg-opacity-90 transition-all duration-300 text-center"
            onClick={() => setIsMenuOpen(false)} // Close menu on click
          >
            Book Now
          </Link> */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
