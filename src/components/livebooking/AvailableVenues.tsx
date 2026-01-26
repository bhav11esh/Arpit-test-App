import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { getAllVenues, type VenueInfo } from '@/utils/livebooking/venueCoordinates';

interface AvailableVenuesProps {
  onVenueSelect?: (venueName: string) => void;
}

export function AvailableVenues({ onVenueSelect }: AvailableVenuesProps) {
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const loadedVenues = await getAllVenues();
        // Sort venues alphabetically by name
        const sorted = loadedVenues.sort((a, b) => 
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        setVenues(sorted);
      } catch (error) {
        console.error('Error loading venues:', error);
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    loadVenues();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <p>Loading venues...</p>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <p>No venues available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="space-y-2">
        {venues.map((venue) => (
          <div
            key={venue.id}
            className="border border-gray-200 rounded-lg p-3 hover:border-black hover:bg-gray-50 transition-all cursor-pointer"
            onClick={() => onVenueSelect?.(venue.name)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-gray-900">{venue.name}</h3>
                {venue.address && (
                  <p className="text-xs text-gray-500 mt-1">{venue.address}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
