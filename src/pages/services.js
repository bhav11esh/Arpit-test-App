import React from 'react'
import { Camera, Clock, Heart, DollarSign, Award } from 'lucide-react';
import ScheduledShoot from '../components/services/hero/ScheduledShoot';
import FeaturesSection from '@/components/services/FeaturesSection';
import CameraLoveSection from '@/components/services/cameralovesection/CameraLoveSection';
import GlimpseGallery from '@/components/services/gallerysection/GlimpseGallery';
import GettingStarted from '@/components/services/gettingstarted/GettingStarted';
import FAQ from '@/components/services/faq/FAQ';
import DiscountSection from '@/components/services/discount/OffersSection';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import TestimonialsSection from '@/components/homepage/TestimonialsSection';
import BtsSection from '@/components/services/BtsSection';
import NewTestimonialsSection from '@/components/services/NewTestimonialSection';
const services = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* Header Section */}
      <ScheduledShoot />

      {/* Why Choose Us Section */}
      <CameraLoveSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* bts section */}
      <BtsSection />

       {/* Getting Started Section */}
       <GettingStarted />

      {/* Portfolio Grid */}
      <GlimpseGallery />

      {/* Pricing Section */}
      <DiscountSection />

      <NewTestimonialsSection />

      {/* FAQ Section */}
      <FAQ />

      {/* Footer */}
      <Footer />
      <WhatsAppButton />
    </div>
  )
}

export default services