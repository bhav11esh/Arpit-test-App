interface MapEmbedProps {
  venue?: string;
  coordinates?: { lat: number; lng: number };
}

export function MapEmbed({ venue, coordinates }: MapEmbedProps = {}) {
  // Default to Hole in the Wall Cafe coordinates if not provided
  const defaultCoordinates = { lat: 12.9352, lng: 77.6245 };
  const defaultVenue = 'Hole in the Wall Cafe, Koramangala, Bangalore';
  
  // Build Google Maps embed URL
  // Using coordinates is more precise, but fallback to venue name if coordinates not available
  const mapQuery = coordinates 
    ? `${coordinates.lat},${coordinates.lng}`
    : venue || defaultVenue;
  
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;

  return (
    <div className="px-6 py-6">
      <div className="aspect-[16/9] bg-gray-200 rounded-lg relative overflow-hidden rounded-lg">
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full"
          title="Venue Location Map"
        />
      </div>
    </div>
  );
}

