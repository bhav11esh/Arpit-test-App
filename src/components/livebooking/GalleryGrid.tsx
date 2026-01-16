import { MessageCircle, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface GalleryGridProps {
  qrScanned: boolean;
}

const qrPhotos = [
  'https://images.unsplash.com/photo-1618886850494-c79fd48305b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMHBvcnRyYWl0fGVufDF8fHx8MTc2NjM5NjU3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1610112839947-5664d10bab30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwaG90byUyMHNob290fGVufDF8fHx8MTc2NjQzNzQzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
];

const portfolioPhotos = [
  'https://images.unsplash.com/photo-1546957221-37816b007052?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm91cCUyMGZyaWVuZHMlMjBwaG90b3xlbnwxfHx8fDE3NjY0MzU2MzB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1706284340703-a253fe04d003?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb2xhcm9pZCUyMGluc3RhbnQlMjBwaG90b3xlbnwxfHx8fDE3NjY0Mzc0Mzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1618886850494-c79fd48305b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaG90b2dyYXBoeSUyMHBvcnRyYWl0fGVufDF8fHx8MTc2NjM5NjU3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1610112839947-5664d10bab30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjBwaG90byUyMHNob290fGVufDF8fHx8MTc2NjQzNzQzOHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
];

export function GalleryGrid({ qrScanned }: GalleryGridProps) {
  return (
    <div className="px-6 py-8">
      <h2 className="text-xl font-medium mb-4">Gallery</h2>

      {qrScanned && (
        <>
          <div className="mb-2 text-sm text-gray-600">Recent at this venue</div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {qrPhotos.map((photo, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden">
                <ImageWithFallback
                  src={photo}
                  alt={`QR photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <div className="h-px bg-gray-200 my-6" />
        </>
      )}

      <div className={qrScanned ? 'text-sm text-gray-600 mb-3' : 'mb-4'}>
        {qrScanned ? 'Our portfolio' : 'Recent captures'}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {portfolioPhotos.map((photo, index) => (
          <div key={index} className="aspect-square rounded-lg overflow-hidden">
            <ImageWithFallback
              src={photo}
              alt={`Portfolio photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

