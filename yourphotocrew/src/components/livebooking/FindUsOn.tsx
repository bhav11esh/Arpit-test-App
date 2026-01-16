import { Star, Ticket } from 'lucide-react';

export function FindUsOn() {
  return (
    <div className="px-6 py-8 border-t border-gray-200">
      <h3 className="font-medium mb-4 text-center">Find Us On</h3>
      
      <div className="flex gap-4 justify-center">
        {/* Google Reviews */}
        <a
          href="https://www.google.com/search?q=hole+in+the+wall+cafe+reviews"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 max-w-[160px] flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
            <Star className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-sm text-center">Google Reviews</span>
        </a>

        {/* BookMyShow */}
        <a
          href="https://in.bookmyshow.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 max-w-[160px] flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
            <Ticket className="w-6 h-6 text-white" />
          </div>
          <span className="text-sm text-center">BookMyShow</span>
        </a>
      </div>
    </div>
  );
}
