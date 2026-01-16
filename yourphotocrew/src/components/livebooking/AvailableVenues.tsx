import { MapPin } from 'lucide-react';
import { VENUE_COORDINATES } from '@/utils/livebooking/venueCoordinates';

interface AvailableVenuesProps {
  onVenueSelect?: (venueName: string) => void;
}

// Helper function to format venue name cleanly
function formatVenueName(venueName: string): string {
  // Convert from ENV key format (e.g., "HOLE_IN_THE_WALL_CAFE") to readable format
  // If already formatted, return as is
  if (venueName.includes(' ')) {
    return venueName;
  }
  // Convert underscores to spaces and title case
  return venueName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function AvailableVenues({ onVenueSelect }: AvailableVenuesProps) {
  // Get venues from environment variables and sort them alphabetically
  const venues = VENUE_COORDINATES 
    ? Object.keys(VENUE_COORDINATES)
        .map(venue => formatVenueName(venue))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    : [];

  return (
    <div className="w-full">
      {venues.length > 0 ? (
        <div className="space-y-2">
          {venues.map((venueName) => (
            <div
              key={venueName}
              className="border border-gray-200 rounded-lg p-3 hover:border-black hover:bg-gray-50 transition-all cursor-pointer"
              onClick={() => onVenueSelect?.(venueName)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-gray-900">{venueName}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">
          <p>No venues available at the moment.</p>
        </div>
      )}
    </div>
  );
}

