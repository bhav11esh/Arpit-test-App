import { useState, useEffect, useRef } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { getAllVenues, VenueInfo } from '@/utils/livebooking/venueCoordinates';

interface VenueInfoStripProps {
  qrScanned: boolean;
  venue: string;
  onVenueSelect?: (venue: VenueInfo) => void;
}

export function VenueInfoStrip({ qrScanned, venue, onVenueSelect }: VenueInfoStripProps) {
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrScanned) {
      const loadVenues = async () => {
        setLoading(true);
        try {
          const loadedVenues = await getAllVenues();
          setVenues(loadedVenues);
        } catch (error) {
          console.error('Error loading venues:', error);
          setVenues([]);
        } finally {
          setLoading(false);
        }
      };
      loadVenues();
    }
  }, [qrScanned]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        <MapPin className="w-4 h-4 text-gray-600" />
        {qrScanned ? (
          <span className="text-sm">{venue}</span>
        ) : (
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1 text-sm hover:text-gray-900 transition-colors"
            >
              <span>{venue || 'Multiple Venues'}</span>
              <ChevronDown 
                className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    Loading venues...
                  </div>
                ) : venues.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No venues available
                  </div>
                ) : (
                  <div className="py-2">
                    {venues.map((venueOption) => (
                      <div
                        key={venueOption.id}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          if (onVenueSelect) {
                            onVenueSelect(venueOption);
                          }
                        }}
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {venueOption.name}
                        </div>
                        {venueOption.address && (
                          <div className="text-xs text-gray-500 mt-1">
                            {venueOption.address}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

