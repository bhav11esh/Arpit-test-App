import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findVenueByName, type VenueInfo } from '@/utils/livebooking/venueCoordinates';

interface VenueInstructionsProps {
  expanded: boolean;
  onToggle: () => void;
  venue: string;
}

export function VenueInstructions({ expanded, onToggle, venue }: VenueInstructionsProps) {
  const [venueInfo, setVenueInfo] = useState<VenueInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadVenueInfo = async () => {
      if (!venue) return;
      
      setLoading(true);
      try {
        const foundVenue = await findVenueByName(venue);
        setVenueInfo(foundVenue);
      } catch (error) {
        console.error('Error loading venue info:', error);
        setVenueInfo(null);
      } finally {
        setLoading(false);
      }
    };

    if (expanded && venue) {
      loadVenueInfo();
    }
  }, [venue, expanded]);

  // Use venue name from JSON if available, otherwise use the passed venue string
  const displayVenueName = venueInfo?.name || venue;
  // Use instructions from JSON if available, otherwise show empty or default message
  const instructions = venueInfo?.instructions || [];

  return (
    <div className="border-t border-b border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium">Venue Instructions</span>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              {/* Venue Name */}
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-4 py-3 rounded-lg">
                <span>{displayVenueName}</span>
                <ChevronDown className="w-4 h-4 opacity-30 ml-auto" />
              </div>

              {/* Instructions */}
              {loading ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Loading instructions...
                </div>
              ) : instructions.length > 0 ? (
                <div className="space-y-3">
                  {instructions.map((instruction, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600">{instruction}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No specific instructions available for this venue.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}