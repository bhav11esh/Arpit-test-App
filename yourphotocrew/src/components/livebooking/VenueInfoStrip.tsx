import { MapPin, Clock } from 'lucide-react';

interface VenueInfoStripProps {
  qrScanned: boolean;
  venue: string;
}

export function VenueInfoStrip({ qrScanned, venue }: VenueInfoStripProps) {
  return (
    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-600" />
          <span className="text-sm">
            {qrScanned ? venue : 'Multiple Venues'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-600">6 PM - 11 PM</span>
        </div>
      </div>
    </div>
  );
}

