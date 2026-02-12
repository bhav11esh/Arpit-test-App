import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAllVenues, VenueInfo } from '@/utils/livebooking/venueCoordinates';

// Fix for Leaflet default icon issue in Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapEmbedProps {
  venue?: string;
  coordinates?: { lat: number; lng: number };
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function MapEmbed({ venue, coordinates }: MapEmbedProps) {
  const [allVenues, setAllVenues] = useState<VenueInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Default Bangalore view
  const bangaloreCenter: [number, number] = [12.9716, 77.5946];
  const defaultZoom = 11;

  useEffect(() => {
    async function loadVenues() {
      try {
        const venues = await getAllVenues();
        setAllVenues(venues);
      } catch (err) {
        console.error('Failed to load venues for map:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVenues();
  }, []);

  // Determine current map center and zoom
  const currentCenter: [number, number] = coordinates
    ? [coordinates.lat, coordinates.lng]
    : bangaloreCenter;

  const currentZoom = coordinates ? 15 : defaultZoom;

  if (typeof window === 'undefined') return null;

  return (
    <div className="px-6 py-6">
      <div className="aspect-[16/9] bg-gray-100 rounded-lg relative overflow-hidden shadow-inner border border-gray-200">
        <MapContainer
          center={currentCenter}
          zoom={currentZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater center={currentCenter} zoom={currentZoom} />

          {/* Show all venues if no specific one is targeted, or just the targeted one if it is */}
          {allVenues.map((v) => (
            <Marker
              key={v.id}
              position={[v.coordinates.lat, v.coordinates.lng]}
              opacity={venue && v.name !== venue ? 0.5 : 1}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-sm">{v.name}</h3>
                  {v.address && <p className="text-xs text-gray-500 mt-1">{v.address}</p>}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${v.coordinates.lat},${v.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 mt-2 block"
                  >
                    Get Directions
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

