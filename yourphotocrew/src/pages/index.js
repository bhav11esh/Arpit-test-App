import Footer from "@/components/Footer";
import AboutSection from "@/components/homepage/AboutSection";
import BrandUspSection from "@/components/homepage/BrandUspSection";
import HeroSection from "@/components/homepage/HeroSection";
import HookupText from "@/components/homepage/HookupText";
import NeedSection from "@/components/homepage/NeedSection";
import ServicesSection from "@/components/homepage/ServicesSection";
import TestimonialsSection from "@/components/homepage/TestimonialsSection";
import Navbar from "@/components/Navbar";
import GlimpseGallery from "@/components/services/gallerysection/GlimpseGallery";
import WhatsAppButton from "@/components/WhatsAppButton";
import { Great_Vibes } from 'next/font/google';
import Head from 'next/head';


const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: '400', // Great Vibes only has one weight (400)
});

const IndexPage = () => {
  return (
    <>
    <Head>
        {/* Primary Meta Tags */}
        <title>Professional Photographer, Portfolio & Portrait Photoshoots – YourPhotoCrew, Bengaluru</title>
        <meta name="title" content="Professional Photographer, Portfolio & Portrait Photoshoots – YourPhotoCrew, Bengaluru" />
        <meta name="description" content="Professional photoshoots in Bangalore—portfolio, branding, matrimony profiles, and more. Candid photography at cafés & events, plus exclusive college fest shoots. Hassle-free, pro-quality portraits near you!" />
        <meta name="keywords" content="Bangalore photographer, professional photoshoot, portfolio photography, candid photography, matrimony photos, branding photoshoot, college fest photography" />
        <meta name="author" content="YourPhotoCrew" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />

        {/* Open Graph / Facebook (for social sharing) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.yourphotocrew.com/" />
        <meta property="og:title" content="Professional Photographer, Portfolio & Portrait Photoshoots – YourPhotoCrew, Bengaluru" />
        <meta property="og:description" content="Professional photoshoots in Bangalore—portfolio, branding, matrimony profiles, and more. Candid photography at cafés & events, plus exclusive college fest shoots." />
        <meta property="og:image" content="https://www.yourphotocrew.com/og-image.jpg" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://www.yourphotocrew.com/" />
        <meta property="twitter:title" content="Professional Photographer, Portfolio & Portrait Photoshoots – YourPhotoCrew, Bengaluru" />
        <meta property="twitter:description" content="Professional photoshoots in Bangalore—portfolio, branding, matrimony profiles, and more. Candid photography at cafés & events, plus exclusive college fest shoots." />
        <meta property="twitter:image" content="https://www.yourphotocrew.com/og-image.jpg" />
      </Head>
    <div className="min-h-screen bg-white w-full overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <HookupText />
      <NeedSection />
      <BrandUspSection />
      <ServicesSection />
      {/* <GallerySection /> */}
      <AboutSection />
      {/* <GlimpseGallery /> */}
      <TestimonialsSection />
      {/* <ContactSection /> */}
      <Footer />
      <WhatsAppButton />
    </div>
    </>
  );
};

export default IndexPage;