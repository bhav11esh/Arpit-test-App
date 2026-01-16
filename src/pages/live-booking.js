import { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

// Disable static generation for this page since it relies on runtime data
export const getServerSideProps = async () => {
  return {
    props: {},
  };
};
import { Header } from '@/components/livebooking/Header';
import { HeroCarousel } from '@/components/livebooking/HeroCarousel';
import { VenueInfoStrip } from '@/components/livebooking/VenueInfoStrip';
import { MapEmbed } from '@/components/livebooking/MapEmbed';
import { HowItWorksSection } from '@/components/livebooking/HowItWorksSection';
import { WhatWeDoSection } from '@/components/livebooking/WhatWeDoSection';
import { GalleryGrid } from '@/components/livebooking/GalleryGrid';
import { PaymentProcessing } from '@/components/livebooking/PaymentProcessing';
import { PaymentSuccess } from '@/components/livebooking/PaymentSuccess';
import { PhotoCarousel } from '@/components/livebooking/PhotoCarousel';
import { RotatingTaglines } from '@/components/livebooking/RotatingTaglines';
import { SessionManager } from '@/components/livebooking/SessionManager';
import { TermsModal } from '@/components/livebooking/TermsModal';
import { GeoPermission } from '@/components/livebooking/GeoPermission';
import { Dialog, DialogContent } from '@/components/livebooking/ui/dialog';

// Dynamically import components that require browser APIs
const DynamicPaymentProcessing = dynamic(
  () => import('@/components/livebooking/PaymentProcessing').then(mod => ({ default: mod.PaymentProcessing })),
  { ssr: false }
);

const DynamicGeoPermission = dynamic(
  () => import('@/components/livebooking/GeoPermission').then(mod => ({ default: mod.GeoPermission })),
  { ssr: false }
);

export default function LiveBooking() {
  const [qrScanned, setQrScanned] = useState(false);
  const [screen, setScreen] = useState('landing');
  const [sessionPrice, setSessionPrice] = useState(299);
  const [codeApplied, setCodeApplied] = useState(false);
  const [filenamesComplete, setFilenamesComplete] = useState(false);
  const [selectedFilenames, setSelectedFilenames] = useState([]);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [qrParams, setQrParams] = useState({});
  const [locationVerified, setLocationVerified] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    howItWorks: false,
    whatWeDo: false,
    specialInstructions: false,
    venueInstructions: false,
  });

  // Extract venue from QR params or use default
  const venue = qrScanned ? (qrParams.venue || qrParams.venueName || 'Hole in the Wall Cafe') : '';

  // Check for QR code parameters on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    // Extract all URL parameters
    urlParams.forEach((value, key) => {
      params[key] = value;
    });

    // If any params exist, treat it as a QR scan
    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      setQrParams(params);
      setQrScanned(true);
      // Show location prompt when QR is scanned
      setShowLocationPrompt(true);
      // Expand "How it works" and "What do we do" by default when QR is scanned
      setExpandedSections(prev => ({ 
        ...prev, 
        howItWorks: true,
        whatWeDo: true,
        specialInstructions: false 
      }));
    }
  }, []);

  const handleGetThatPicClick = () => {
    // Open WhatsApp
    const requestId = qrParams.requestId || `HITW_${new Date().toLocaleDateString('en-GB').replace(/\//g, '')}${new Date().getHours()}${new Date().getMinutes()}_T04`;
    const venueInfo = venue ? `\nVenue: ${venue}` : '';
    const qrInfo = (qrParams && typeof qrParams === 'object' && Object.keys(qrParams).length > 0) ? `\nQR Params: ${JSON.stringify(qrParams)}` : '';
    const message = `I want to try it out\nRequest ID: ${requestId}${venueInfo}${qrInfo}`;
    const phoneNumber = qrParams.phoneNumber || qrParams.phone || '919876543210';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in new window
    window.open(whatsappUrl, '_blank');
    
    // Navigate to session screen
    setScreen('session');
  };

  const handlePaymentComplete = (response) => {
    if (response) {
      console.log('Payment completed successfully:', response);
    }
    setScreen('success');
  };

  const handlePaymentCancel = () => {
    // Return to session screen if payment is cancelled
    setScreen('session');
  };

  const handleCompletePayment = () => {
    // First action: Send WhatsApp message with selected filenames
    const filenamesText = selectedFilenames.join(', ');
    const message = `Here's the hard copies I want ${filenamesText}`;
    const phoneNumber = '917676235229';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in new window
    window.open(whatsappUrl, '_blank');
    
    // Second action: Navigate to payment screen (Razorpay flow)
    setScreen('payment');
  };

  const handleBackToBooking = () => {
    // Reset booking states but keep QR scanned state
    setSessionPrice(299);
    setCodeApplied(false);
    setFilenamesComplete(false);
    setSelectedFilenames([]);
    setScreen('landing');
    
    // Keep QR scanned and expand relevant sections
    setExpandedSections(prev => ({ 
      ...prev, 
      howItWorks: true,
      whatWeDo: true,
      venueInstructions: false 
    }));
  };

  return (
    <>
      <Head>
        <title>Live Booking - YourPhotoCrew</title>
        <meta name="description" content="Book a live photography session at our partner venues" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen bg-white live-booking-page">
        {/* Main Content */}
        {screen === 'landing' && (
          <>
            <Header qrScanned={qrScanned} />
            
            <main className="pb-32">
              {!qrScanned ? (
                <>
                  {/* Discovery Mode - No QR Scan */}
                  <HeroCarousel qrScanned={qrScanned} venue={venue} />
                  <VenueInfoStrip qrScanned={qrScanned} venue={venue} />
                  <MapEmbed />
                  
                  {/* Pricing Teaser */}
                  <div className="px-6 py-8 text-center">
                    <div className="text-4xl mb-2">₹299</div>
                    <p className="text-gray-500 text-sm italic">
                      Scan QR at venue to book
                    </p>
                  </div>

                  <HowItWorksSection 
                    expanded={expandedSections.howItWorks}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, howItWorks: !prev.howItWorks }))}
                  />
                  <WhatWeDoSection 
                    expanded={expandedSections.whatWeDo}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, whatWeDo: !prev.whatWeDo }))}
                  />
                  
                  <GalleryGrid qrScanned={qrScanned} />
                </>
              ) : !locationVerified ? (
                <>
                  {/* Show main content even when location verification is pending or failed */}
                  <PhotoCarousel />
                  <RotatingTaglines />
                  
                  <HowItWorksSection 
                    expanded={expandedSections.howItWorks}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, howItWorks: !prev.howItWorks }))}
                  />
                  
                  <WhatWeDoSection 
                    expanded={expandedSections.whatWeDo}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, whatWeDo: !prev.whatWeDo }))}
                  />
                  
                  {/* Terms & Conditions Link */}
                  <div className="px-6 py-4">
                    <button
                      onClick={() => setTermsModalOpen(true)}
                      className="text-sm text-blue-600 underline"
                    >
                      View Terms & Conditions
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Live booking - Location verified */}
                  <PhotoCarousel />
                  <RotatingTaglines />
                  
                  <HowItWorksSection 
                    expanded={expandedSections.howItWorks}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, howItWorks: !prev.howItWorks }))}
                  />
                  
                  <WhatWeDoSection 
                    expanded={expandedSections.whatWeDo}
                    onToggle={() => setExpandedSections(prev => ({ ...prev, whatWeDo: !prev.whatWeDo }))}
                  />
                  
                  {/* Terms & Conditions Link - Only visible after QR scan */}
                  <div className="px-6 py-4">
                    <button
                      onClick={() => setTermsModalOpen(true)}
                      className="text-sm text-blue-600 underline"
                    >
                      View Terms & Conditions
                    </button>
                  </div>
                </>
              )}
            </main>

            {/* Location Verification Popup */}
            {showLocationPrompt && (
              <Dialog open={showLocationPrompt} onOpenChange={(open) => {
                if (!open) {
                  setShowLocationPrompt(false);
                }
              }}>
                <DialogContent className="max-w-md mx-4 bg-white border-2 border-gray-200 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                  <DynamicGeoPermission
                    venueName={venue}
                    maxDistanceMeters={parseInt(process.env.NEXT_PUBLIC_VENUE_MAX_DISTANCE_METERS || '500', 10)}
                    onVerified={() => {
                      setLocationVerified(true);
                      setShowLocationPrompt(false);
                    }}
                    onRetry={() => {
                      setShowLocationPrompt(true);
                    }}
                    onFailed={() => {
                      // Keep popup open to show available venues
                    }}
                  />
                </DialogContent>
              </Dialog>
            )}

            {/* Sticky Bottom Button - only when QR scanned AND location verified */}
            {qrScanned && locationVerified && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
                <button
                  onClick={handleGetThatPicClick}
                  className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Let's give it a shoot
                </button>
              </div>
            )}

            {/* Terms Modal */}
            <TermsModal
              open={termsModalOpen}
              onClose={() => setTermsModalOpen(false)}
            />
          </>
        )}

        {screen === 'session' && (
          <>
            <Header qrScanned={qrScanned} />
            
            <main className="pb-32">
              <SessionManager 
                onPriceChange={setSessionPrice} 
                venue={venue}
                expandedVenueInstructions={expandedSections.venueInstructions}
                onToggleVenueInstructions={() => setExpandedSections(prev => ({ ...prev, venueInstructions: !prev.venueInstructions }))}
                onCodeApplied={setCodeApplied}
                onFilenamesComplete={setFilenamesComplete}
                onFilenamesChange={setSelectedFilenames}
              />
            </main>

            {/* Complete Payment Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
              <button
                onClick={handleCompletePayment}
                disabled={!codeApplied || !filenamesComplete}
                className={`w-full py-4 rounded-lg transition-colors font-medium ${
                  codeApplied && filenamesComplete
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Complete Payment ₹{sessionPrice}
              </button>
            </div>
          </>
        )}

        {screen === 'payment' && (
          <DynamicPaymentProcessing
            onComplete={handlePaymentComplete}
            onCancel={handlePaymentCancel}
            amount={sessionPrice}
            venue={venue}
          />
        )}

        {screen === 'success' && (
          <PaymentSuccess
            onBackToBooking={handleBackToBooking}
          />
        )}
      </div>
    </>
  );
}

