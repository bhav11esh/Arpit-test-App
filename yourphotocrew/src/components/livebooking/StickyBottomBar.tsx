import { Camera, Minus, Plus } from 'lucide-react';

interface StickyBottomBarProps {
  itemCount: number;
  price: number;
  onBookClick: () => void;
}

export function StickyBottomBar({ itemCount, price, onBookClick }: StickyBottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Requests:</span>
            <span className="font-medium">{itemCount}</span>
          </div>
        </div>
        
        <div className="text-xl">₹{price}</div>
      </div>

      <button
        onClick={onBookClick}
        className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
      >
        Get 'that' pic
      </button>
    </div>
  );
}