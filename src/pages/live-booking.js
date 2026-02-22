import { useState, useEffect } from 'react';
import { MapPin, Clock, Info, CheckCircle2 } from 'lucide-react';
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
// import { MapEmbed } from '@/components/livebooking/MapEmbed'; // Replaced with dynamic import below
import { HowItWorksSection } from '@/components/livebooking/HowItWorksSection';
import { WhatWeDoSection } from '@/components/livebooking/WhatWeDoSection';
import { PaymentProcessing } from '@/components/livebooking/PaymentProcessing';
import { PaymentSuccess } from '@/components/livebooking/PaymentSuccess';
import { PhotoCarousel } from '@/components/livebooking/PhotoCarousel';

import { SessionManager } from '@/components/livebooking/SessionManager';
import { TermsModal } from '@/components/livebooking/TermsModal';
import { GeoPermission } from '@/components/livebooking/GeoPermission';
import { Dialog, DialogContent } from '@/components/livebooking/ui/dialog';
import { supabase } from '@/utils/livebooking/supabase';

// Dynamically import components that require browser APIs
const DynamicPaymentProcessing = dynamic(
  () => import('@/components/livebooking/PaymentProcessing').then(mod => ({ default: mod.PaymentProcessing })),
  { ssr: false }
);

const DynamicGeoPermission = dynamic(
  () => import('@/components/livebooking/GeoPermission').then(mod => ({ default: mod.GeoPermission })),
  { ssr: false }
);

const DynamicMapEmbed = dynamic(
  () => import('@/components/livebooking/MapEmbed').then(mod => ({ default: mod.MapEmbed })),
  { ssr: false }
);

export default function LiveBooking() {
  const [qrScanned, setQrScanned] = useState(false);
  const [screen, setScreen] = useState('landing');
  const [sessionPrice, setSessionPrice] = useState(99);
  const [codeApplied, setCodeApplied] = useState(false);
  const [filenamesComplete, setFilenamesComplete] = useState(false);
  const [selectedFilenames, setSelectedFilenames] = useState([]);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [qrParams, setQrParams] = useState({});
  const [locationVerified, setLocationVerified] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [detectedVenue, setDetectedVenue] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [tableName, setTableName] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    howItWorks: true,
    whatWeDo: false,
    specialInstructions: false,
    venueInstructions: false,
  });
  const [isNotifying, setIsNotifying] = useState(false);
  const [searchBookingId, setSearchBookingId] = useState('');
  const [foundDriveLink, setFoundDriveLink] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [photographerDetails, setPhotographerDetails] = useState(null);

  // Extract venue from detected venue, QR params, selected venue, or use default
  const venue = detectedVenue?.name || selectedVenue?.name || (qrScanned ? (qrParams.venue || qrParams.venueName || 'Hole in the Wall Cafe') : '');

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for reset flag first (for testing)
    const urlParamsCheck = new URLSearchParams(window.location.search);
    if (urlParamsCheck.get('reset') === 'true') {
      localStorage.removeItem('liveBookingState');
      // Remove reset param from URL without reload
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.search.replace(/[?&]reset=true/, '');
      window.history.replaceState({ path: newUrl }, '', newUrl);
    }



    // Try to load saved state
    const savedState = localStorage.getItem('liveBookingState');
    let restoredVerified = false;
    let initialQrParams = {};

    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);

        // Check for expiration (4 hours)
        const ONE_HOUR = 60 * 60 * 1000;
        const EXPIRATION_TIME = 4 * ONE_HOUR;
        const now = Date.now();

        if (parsedState.lastUpdated && (now - parsedState.lastUpdated > EXPIRATION_TIME)) {
          console.log('Saved state expired, clearing...');
          localStorage.removeItem('liveBookingState');
        } else {
          // Restore state if valid and not expired
          if (parsedState.qrScanned) setQrScanned(parsedState.qrScanned);
          if (parsedState.screen) setScreen(parsedState.screen);
          if (parsedState.sessionPrice) setSessionPrice(parsedState.sessionPrice);
          if (parsedState.codeApplied) setCodeApplied(parsedState.codeApplied);
          if (parsedState.filenamesComplete) setFilenamesComplete(parsedState.filenamesComplete);
          if (parsedState.selectedFilenames) setSelectedFilenames(parsedState.selectedFilenames);
          if (parsedState.qrParams) {
            setQrParams(parsedState.qrParams);
            initialQrParams = parsedState.qrParams;
          }
          if (parsedState.locationVerified) {
            setLocationVerified(parsedState.locationVerified);
            restoredVerified = true;
          }
          if (parsedState.detectedVenue) setDetectedVenue(parsedState.detectedVenue);
          if (parsedState.selectedVenue) setSelectedVenue(parsedState.selectedVenue);
          if (parsedState.tableName) setTableName(parsedState.tableName);
        }
      } catch (e) {
        console.error('Failed to parse saved state:', e);
        // If parse fails, clear it
        localStorage.removeItem('liveBookingState');
      }
    }

    // Check for QR code parameters
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};

    urlParams.forEach((value, key) => {
      params[key] = value;
    });

    if (params && typeof params === 'object' && Object.keys(params).length > 0) {
      // MERGE URL params with initialQrParams instead of overwriting
      // This ensures requestId and activationCode from storage aren't lost
      setQrParams(prev => ({ ...initialQrParams, ...prev, ...params }));

      const tableNameParam = params.tableName;
      if (tableNameParam) {
        setTableName(tableNameParam);
      }

      setQrScanned(true);

      if (!restoredVerified) {
        setShowLocationPrompt(true);

        setExpandedSections(prev => ({
          ...prev,
          howItWorks: true,
          whatWeDo: true,
          specialInstructions: false
        }));
      }
    }
  }, []);

  // Save state to localStorage whenever key variables change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stateToSave = {
      qrScanned,
      screen,
      sessionPrice,
      codeApplied,
      filenamesComplete,
      selectedFilenames,
      qrParams,
      locationVerified,
      detectedVenue,
      selectedVenue,
      tableName,
      lastUpdated: Date.now()
    };

    localStorage.setItem('liveBookingState', JSON.stringify(stateToSave));
  }, [
    qrScanned,
    screen,
    sessionPrice,
    codeApplied,
    filenamesComplete,
    selectedFilenames,
    qrParams,
    locationVerified,
    detectedVenue,
    selectedVenue,
    tableName
  ]);

  // Real-time listener for booking status updates
  useEffect(() => {
    if (!qrParams?.requestId || !supabase) return;

    console.log(`Setting up real-time listener for booking: ${qrParams.requestId}`);

    const channel = supabase
      .channel(`booking_status_${qrParams.requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_bookings',
          filter: `request_id=eq.${qrParams.requestId}`
        },
        async (payload) => {
          const newStatus = payload.new.status;
          console.log(`Booking status changed to: ${newStatus}`);

          // Fetch updated booking with photographer details
          const { data: bookingData, error } = await supabase
            .from('live_bookings')
            .select('*, photographer:photographer_id(name, phone_number)')
            .eq('request_id', qrParams.requestId)
            .single();

          if (bookingData?.photographer) {
            setPhotographerDetails(bookingData.photographer);
          }

          if ((newStatus === 'PAID' || newStatus === 'COMPLETED') && screen !== 'success') {
            console.log('Payment/Completion detected via realtime update');
            setScreen('success');
          }

          if (newStatus === 'NOT_PAID' || newStatus === 'CANCELLED') {
            alert(`Booking Status Update: The photographer has marked this request as ${newStatus.replace('_', ' ')}. \n\nIf this is a mistake, please talk to the photographer at the venue.`);
            // Reset to landing if permanently cancelled or marked unpaid
            localStorage.removeItem('liveBookingState');
            window.location.reload();
          }
        }
      )
      .subscribe();

    // Initial fetch to get photographer if already assigned
    const fetchBooking = async () => {
      const { data } = await supabase
        .from('live_bookings')
        .select('*, photographer:photographer_id(name, phone_number)')
        .eq('request_id', qrParams.requestId)
        .single();

      if (data?.photographer) {
        setPhotographerDetails(data.photographer);
      }
    };
    fetchBooking();

    // Polling fallback every 5 seconds
    const pollInterval = setInterval(async () => {
      if (!qrParams?.requestId) return;

      const { data, error } = await supabase
        .from('live_bookings')
        .select('status, photographer:photographer_id(name, phone_number)')
        .eq('request_id', qrParams.requestId)
        .single();

      // Detailed logging for debugging
      if (error) {
        console.error('Polling error:', error);
      }

      if (data) {
        if ((data.status === 'PAID' || data.status === 'COMPLETED') && screen !== 'success') {
          setScreen('success');
        } else if ((data.status === 'NOT_PAID' || data.status === 'CANCELLED') && screen !== 'landing') {
          alert(`Booking Status Update: The photographer has marked this request as ${data.status.replace('_', ' ')}. \n\nIf this is a mistake, please talk to the photographer at the venue.`);
          localStorage.removeItem('liveBookingState');
          window.location.reload();
        }

        // Update photographer details if available
        if (data.photographer) {
          setPhotographerDetails(data.photographer);
        }
      }
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [qrParams?.requestId, screen]);


  const handleGetThatPicClick = async () => {
    // Generate dynamic acronym based on venue
    let venueAcronym = 'HITW';
    const venueNameLocal = (venue || qrParams.venue || qrParams.venueName || '').toLowerCase();

    if (venueNameLocal.includes('bier library')) venueAcronym = 'TBLK';
    else if (venueNameLocal.includes('marco polo')) venueAcronym = 'MPC';
    else if (venueNameLocal.includes('roastea')) venueAcronym = 'RK';
    else if (venueNameLocal.includes('garden asia')) venueAcronym = 'GA';
    else if (venueNameLocal.includes('hole in the wall')) venueAcronym = 'HITW';

    // Generate random 4-digit activation code for the photographer
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Generate Request ID
    const tableSuffix = tableName ? `_${tableName}` : '_T004';
    const requestId = qrParams.requestId || `${venueAcronym}_${new Date().toLocaleDateString('en-GB').replace(/\//g, '')}${new Date().getHours()}${new Date().getMinutes()}${tableSuffix}`;

    // Update qrParams with both IDs
    setQrParams(prev => ({ ...prev, requestId, activationCode }));

    setIsNotifying(true);

    try {
      // 1. Insert into Supabase if available
      if (supabase) {
        const { error } = await supabase
          .from('live_bookings')
          .insert([
            {
              request_id: requestId,
              activation_code: activationCode,
              venue_name: venue || qrParams.venue || qrParams.venueName || 'Unknown Venue',
              table_name: tableName || 'T004',
              qr_params: qrParams,
              status: 'PENDING'
            }
          ]);

        if (error) {
          console.error('Error inserting booking:', error);
          // Fallback to WhatsApp if database fails
          redirectToWhatsApp(requestId);
        } else {
          // Success! Update UI to show photographer is coming
          setScreen('session');
        }
      } else {
        // Fallback to WhatsApp if Supabase not configured
        redirectToWhatsApp(requestId);
      }
    } catch (err) {
      console.error('Failed to notify photographer:', err);
      redirectToWhatsApp(requestId);
    } finally {
      setIsNotifying(false);
    }
  };

  const redirectToWhatsApp = (requestId) => {
    const venueInfo = venue ? `\nVenue: ${venue}` : '';
    const tableInfo = tableName ? `\nTable: ${tableName}` : '';
    const qrInfo = (qrParams && typeof qrParams === 'object' && Object.keys(qrParams).length > 0) ? `\nQR Params: ${JSON.stringify(qrParams)}` : '';
    const message = `I want to try it out\nRequest ID: ${requestId}${venueInfo}${tableInfo}${qrInfo}`;
    const phoneNumber = detectedVenue?.phone || qrParams.phoneNumber || qrParams.phone || '919876543210';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    setScreen('session');
  };

  const handleSearchDriveLink = async () => {
    if (!searchBookingId.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setFoundDriveLink(null);
    try {
      const { data, error } = await supabase
        .from('live_bookings')
        .select('drive_link, status')
        .eq('request_id', searchBookingId.trim())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setSearchError('Booking ID not found. Please check and try again.');
      } else if (!data.drive_link) {
        setSearchError('Drive link not ready yet. Please check back later or contact support.');
      } else {
        setFoundDriveLink(data.drive_link);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchError('An error occurred. Please try again.');
    } finally {
      setIsSearching(false);
    }
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
    // V1 FIX: Remove WhatsApp redirect, go straight to payment
    // Filenames are now handled via Supabase on payment success
    setScreen('payment');
  };

  const handleBackToBooking = () => {
    // 1. Clear saved session from localStorage
    localStorage.removeItem('liveBookingState');

    // 2. Clear URL parameters (remove tableName, venue, etc.)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.search = ''; // Remove all query params
      window.history.replaceState({}, '', url.toString());
    }

    // 3. Complete Reset of State (Go to "Discovery/Home" mode)
    setQrScanned(false); // Shows "Get My Drive Link" search bar
    setQrParams({});
    setTableName(null); // Removes table name header
    setScreen('landing');

    setSessionPrice(99);
    setCodeApplied(false);
    setFilenamesComplete(false);
    setSelectedFilenames([]);

    // Reset expanded sections to default
    setExpandedSections({
      howItWorks: true,
      whatWeDo: false,
      specialInstructions: false,
      venueInstructions: false,
    });
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
              {/* Drive Link Lookup Section - Only visible on discovery mode (not scanned) */}
              {!qrScanned && (
                <div className="mx-6 mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm mb-8">
                  <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                    <span className="text-blue-600">📸</span> Get My Drive Link
                  </h3>
                  <p className="text-xs text-blue-700 mb-4">
                    Enter your Booking ID to find your photos
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Booking ID (e.g. HITW_...)"
                      value={searchBookingId}
                      onChange={(e) => setSearchBookingId(e.target.value)}
                      className="flex-1 px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                    <button
                      onClick={handleSearchDriveLink}
                      disabled={isSearching || !searchBookingId.trim()}
                      className="px-6 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                      {isSearching ? "..." : "Get"}
                    </button>
                  </div>
                  {searchError && (
                    <p className="mt-3 text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                      {searchError}
                    </p>
                  )}
                  {foundDriveLink && (
                    <div className="mt-4 p-4 bg-white rounded-xl border-2 border-green-200 shadow-md animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs font-semibold text-green-700 mb-2">🎉 Found your photos!</p>
                      <a
                        href={foundDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full py-3 bg-green-600 text-white rounded-lg text-center font-bold text-sm hover:bg-green-700 transition-transform active:scale-95"
                      >
                        Open Drive Folder
                      </a>
                    </div>
                  )}
                </div>
              )}

              {!qrScanned ? (
                <>
                  {/* Discovery Mode - No QR Scan */}
                  <HeroCarousel qrScanned={qrScanned} venue={venue} />
                  <VenueInfoStrip
                    detectedVenue={detectedVenue}
                    selectedVenue={selectedVenue}
                    setSelectedVenue={setSelectedVenue}
                  />
                  <DynamicMapEmbed
                    venue={selectedVenue?.name}
                    coordinates={selectedVenue?.coordinates}
                  />

                  {/* Pricing Teaser */}
                  <div className="px-6 py-8 text-center">
                    <div className="text-4xl mb-2">₹99</div>
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
                </>
              ) : !locationVerified ? (
                <>
                  {/* Show main content even when location verification is pending or failed */}
                  <PhotoCarousel />
                  <VenueInfoStrip
                    detectedVenue={detectedVenue}
                    selectedVenue={selectedVenue}
                    setSelectedVenue={setSelectedVenue}
                  />
                  {true && (
                    <div className="absolute top-20 left-0 right-0 z-10 mx-6">
                      <div className="p-4 bg-white/95 backdrop-blur border border-gray-100 rounded-2xl shadow-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl animate-pulse">
                            <MapPin className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold">Verifying Location</h3>
                            <p className="text-xs text-gray-500">Checking if you're at {venue}...</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}



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
                    venueName={qrScanned && (qrParams.venue || qrParams.venueName) ? (qrParams.venue || qrParams.venueName) : undefined}
                    maxDistanceMeters={parseInt(process.env.NEXT_PUBLIC_VENUE_MAX_DISTANCE_METERS || '600', 10)}
                    onVerified={(venueInfo) => {
                      setDetectedVenue(venueInfo);
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

            {/* Sticky Allow Location Button - when prompt dismissed but not verified */}
            {qrScanned && !locationVerified && !showLocationPrompt && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30 animate-in slide-in-from-bottom-5">
                <button
                  onClick={() => setShowLocationPrompt(true)}
                  className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2 shadow-md"
                >
                  <MapPin className="w-5 h-5" />
                  Allow Location Access
                </button>
                <p className="text-xs text-center text-gray-500 mt-2">
                  Required to verify you are at the venue
                </p>
              </div>
            )}

            {/* Sticky Bottom Button - only when QR scanned AND location verified */}
            {qrScanned && locationVerified && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
                <button
                  onClick={handleGetThatPicClick}
                  disabled={isNotifying}
                  className="w-full py-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isNotifying ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Notifying Photographer...
                    </>
                  ) : (
                    "Bring the Camera Over 📸"
                  )}
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

        {/* Debug Info Footer */}
        <div className="text-[10px] text-gray-300 text-center pb-2">
          ID: {qrParams?.requestId || 'None'}
        </div>

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
                requestId={qrParams.requestId}
                activationCode={qrParams.activationCode}
                photographerName={photographerDetails?.name}
                photographerPhone={photographerDetails?.phone_number}
              />
            </main>

            {/* Complete Payment Button */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-30">
              <button
                onClick={handleCompletePayment}
                disabled={!codeApplied || !filenamesComplete}
                className={`w-full py-4 rounded-lg transition-colors font-medium ${codeApplied && filenamesComplete
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
            requestId={qrParams.requestId}
            hardcopyFilenames={selectedFilenames}
          />
        )}

        {screen === 'success' && (
          <PaymentSuccess
            onBackToBooking={handleBackToBooking}
            requestId={qrParams.requestId}
          />
        )}
      </div>
    </>
  );
}

