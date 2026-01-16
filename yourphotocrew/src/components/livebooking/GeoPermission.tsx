import { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { isWithinRange } from '@/utils/livebooking/venueCoordinates';
import { AvailableVenues } from './AvailableVenues';

interface GeoPermissionProps {
  onVerified: () => void;
  onRetry: () => void;
  onFailed?: () => void;
  venueName: string;
  maxDistanceMeters?: number;
}

export function GeoPermission({ 
  onVerified, 
  onRetry,
  onFailed,
  venueName,
  maxDistanceMeters 
}: GeoPermissionProps) {
  // Use environment variable for max distance if not provided, default to 500
  const maxDistance = maxDistanceMeters || 
    parseInt(process.env.NEXT_PUBLIC_VENUE_MAX_DISTANCE_METERS || '500', 10);
  const [status, setStatus] = useState<'prompt' | 'checking' | 'failed' | 'denied'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleAllowLocation = () => {
    setStatus('checking');
    setErrorMessage('');

    if (!navigator.geolocation) {
      setStatus('failed');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Check if user is within range of the venue
        const withinRange = isWithinRange(
          userLat,
          userLng,
          venueName,
          maxDistance
        );

        if (withinRange) {
          onVerified();
        } else {
          setStatus('failed');
          setErrorMessage(`You need to be within ${maxDistance}m of ${venueName} to proceed.`);
        }
      },
      (error) => {
        setStatus('denied');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage('Location access denied. Please enable location permissions in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage('Location information is unavailable.');
            break;
          case error.TIMEOUT:
            setErrorMessage('Location request timed out. Please try again.');
            break;
          default:
            setErrorMessage('An unknown error occurred while getting your location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleRetry = () => {
    setStatus('prompt');
    setErrorMessage('');
    onRetry();
  };

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center py-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center w-full"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <MapPin className="w-16 h-16 text-black" />
          </motion.div>
          <p className="text-gray-600 font-medium">Verifying your location...</p>
        </motion.div>
      </div>
    );
  }

  if (status === 'failed' || status === 'denied') {
    return (
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">
              {status === 'denied' ? 'Location Access Denied' : 'Location Not Verified'}
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
              {errorMessage || 'Please stay within the venue premises to proceed with your booking.'}
            </p>
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium mb-6"
            >
              Try Again
            </button>
          </div>
          
          {/* Show Available Venues in the same popup */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-center">Available Venues</h3>
            <div className="max-h-64 overflow-y-auto">
              <AvailableVenues />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center w-full"
      >
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <MapPin className="w-10 h-10 text-black" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-gray-900">Confirm Your Location</h2>
        <p className="text-gray-600 mb-6 text-sm">
          We need to verify that you're at the venue to proceed with your booking.
        </p>
        <button
          onClick={handleAllowLocation}
          className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors mb-3 font-medium"
        >
          Allow Location Access
        </button>
        <p className="text-xs text-gray-500">
          Your location is only used to verify venue presence
        </p>
      </motion.div>
    </div>
  );
}
