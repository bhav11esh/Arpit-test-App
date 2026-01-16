export function MapEmbed() {
  return (
    <div className="px-6 py-6">
      <div className="aspect-[16/9] bg-gray-200 rounded-lg relative overflow-hidden">
        {/* Mock map - in production this would be Google Maps embed */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">📍</div>
            <div className="text-sm text-gray-600">Hole in the Wall Cafe</div>
            <div className="text-xs text-gray-500 mt-1">Koramangala, Bangalore</div>
          </div>
        </div>
        
        {/* Simulated map styling */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)]" />
        </div>
      </div>
    </div>
  );
}

