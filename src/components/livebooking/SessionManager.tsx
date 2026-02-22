import { useState, useEffect } from 'react';
import { Clock, Plus, Minus } from 'lucide-react';
import { VenueInstructions } from './VenueInstructions';
import { findVenueByName, type VenueInfo } from '@/utils/livebooking/venueCoordinates';

interface SessionManagerProps {
  onPriceChange: (price: number) => void;
  venue: string;
  expandedVenueInstructions: boolean;
  onToggleVenueInstructions: () => void;
  onCodeApplied: (applied: boolean) => void;
  onFilenamesComplete: (complete: boolean) => void;
  onFilenamesChange: (filenames: string[]) => void;
  requestId?: string;
  activationCode?: string;
  photographerName?: string;
  photographerPhone?: string;
}

export function SessionManager({
  onPriceChange,
  venue,
  expandedVenueInstructions,
  onToggleVenueInstructions,
  onCodeApplied,
  onFilenamesComplete,
  onFilenamesChange,
  requestId,
  activationCode,
  photographerName,
  photographerPhone
}: SessionManagerProps) {
  const [photographerCode, setPhotographerCode] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [baseTime, setBaseTime] = useState(5); // in minutes
  const [timeRemaining, setTimeRemaining] = useState(5 * 60); // in seconds
  const [selectedExtension, setSelectedExtension] = useState<number>(0); // 0, 5, or 10
  const [hardcopyCount, setHardcopyCount] = useState(1); // Start with 1 hardcopy (base package)
  const [hardcopyFilenames, setHardcopyFilenames] = useState<string[]>(['']); // Array of filenames
  const [selectedFilenames, setSelectedFilenames] = useState<boolean[]>([false]); // Track which filenames are confirmed
  const [venueInfo, setVenueInfo] = useState<VenueInfo | null>(null);

  // Calculate total price based on extensions
  const calculatePrice = (extensionMinutes: number) => {
    if (extensionMinutes === 0) return 99;
    if (extensionMinutes === 5) return 99 + 75;
    if (extensionMinutes === 10) return 99 + 150;
    return 99; // fallback
  };

  // Calculate number of included hardcopies based on extensions
  const getIncludedHardcopies = () => {
    return 1; // Always 1 base hardcopy included
  };

  // Calculate additional hardcopies (beyond what's included)
  const getAdditionalHardcopies = () => {
    const included = getIncludedHardcopies();
    return Math.max(0, hardcopyCount - included);
  };

  // Calculate total price including hardcopies
  const getTotalPrice = () => {
    const basePrice = calculatePrice(selectedExtension);
    const additionalCopies = getAdditionalHardcopies();
    return basePrice + (additionalCopies * 39);
  };

  // Update price when extensions or hardcopies change
  useEffect(() => {
    onPriceChange(getTotalPrice());
  }, [selectedExtension, hardcopyCount, onPriceChange]);

  // Load venue info when venue changes
  useEffect(() => {
    const loadVenueInfo = async () => {
      if (venue && typeof venue === 'string') {
        try {
          const found = await findVenueByName(venue);
          setVenueInfo(found);
        } catch (error) {
          console.error('Error loading venue info:', error);
          setVenueInfo(null);
        }
      } else {
        setVenueInfo(null);
      }
    };
    loadVenueInfo();
  }, [venue]);

  // Get valid codes from venue-specific codes or fall back to environment variables
  const getValidCodes = (): string[] => {
    // First, try to use venue-specific photographer codes
    if (venueInfo?.photographerCode && venueInfo.photographerCode.length > 0) {
      return venueInfo.photographerCode.map(code => code.trim()).filter(code => code.length > 0);
    }

    // Fall back to environment variable if venue doesn't have codes
    return (process.env.NEXT_PUBLIC_PHOTOGRAPHER_CODES || '')
      .split(',')
      .map(code => code.trim())
      .filter(code => code.length > 0);
  };

  // Check if the entered code is valid
  const isCodeValid = (): boolean => {
    const enteredCode = photographerCode.trim();
    if (enteredCode.length === 0) return false;

    // 1. Check against the dynamic activation code from Supabase/Props
    if (activationCode && enteredCode === activationCode) {
      return true;
    }

    // 2. Fall back to venue-specific photographer codes (backward compatibility)
    const validCodes = getValidCodes();
    return validCodes.includes(enteredCode);
  };

  // Timer countdown - only starts when sessionStarted is true
  useEffect(() => {
    if (!sessionStarted) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          // Do not clear interval here, let it run so it can resume if time is added
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStarted]);

  const handleStartSession = () => {
    // Double-check code validity before starting
    if (!isCodeValid()) {
      console.warn('Invalid photographer code');
      return;
    }

    // Start the session and timer
    setSessionStarted(true);
    onCodeApplied(true);
  };

  const handleExtension = (minutes: number) => {
    // Calculate what the total session time would be with this extension
    const currentTimeInMinutes = timeRemaining / 60;

    // Check if trying to deselect (clicking same button)
    if (selectedExtension === minutes) {
      // Can't deselect if remaining time is less than the extension amount
      if (currentTimeInMinutes < minutes) {
        return; // Block deselection
      }
      // Deselect - subtract the extension time from remaining time
      setSelectedExtension(0);
      setBaseTime(5);
      setTimeRemaining((prev) => Math.max(0, prev - (minutes * 60)));
    } else {
      // Check if trying to switch to a smaller extension
      if (minutes < selectedExtension && currentTimeInMinutes < minutes) {
        return; // Block switching to smaller extension if time remaining is less than new extension
      }

      // Select new extension - add the difference in time
      const timeDifference = minutes - selectedExtension;
      setSelectedExtension(minutes);
      setBaseTime(5 + minutes);
      setTimeRemaining((prev) => Math.max(0, prev + (timeDifference * 60)));
    }
  };

  const handleHardcopyChange = (delta: number) => {
    const minCopies = getIncludedHardcopies();
    const newCount = hardcopyCount + delta;

    // Don't allow going below the minimum included copies
    if (newCount >= minCopies) {
      setHardcopyCount(newCount);
    }
  };

  // Update filename arrays when hardcopy count changes
  useEffect(() => {
    setHardcopyFilenames(prev => {
      const newFilenames = [...prev];
      while (newFilenames.length < hardcopyCount) {
        newFilenames.push('');
      }
      while (newFilenames.length > hardcopyCount) {
        newFilenames.pop();
      }
      return newFilenames;
    });

    setSelectedFilenames(prev => {
      const newSelected = [...prev];
      while (newSelected.length < hardcopyCount) {
        newSelected.push(false);
      }
      while (newSelected.length > hardcopyCount) {
        newSelected.pop();
      }
      return newSelected;
    });
  }, [hardcopyCount]);

  // Check if all filenames are selected and notify parent
  useEffect(() => {
    const allSelected = selectedFilenames.every(selected => selected) && selectedFilenames.length > 0;
    onFilenamesComplete(allSelected);
  }, [selectedFilenames, onFilenamesComplete]);

  const handleFilenameChange = (index: number, value: string) => {
    const newFilenames = [...hardcopyFilenames];
    newFilenames[index] = value;
    setHardcopyFilenames(newFilenames);

    // If they change the filename, unmark it as selected
    if (selectedFilenames[index]) {
      const newSelected = [...selectedFilenames];
      newSelected[index] = false;
      setSelectedFilenames(newSelected);
    }
  };

  const handleSelectFilename = (index: number) => {
    if (hardcopyFilenames[index].trim() !== '') {
      const newSelected = [...selectedFilenames];
      newSelected[index] = true;
      setSelectedFilenames(newSelected);

      // Pass selected filenames to parent
      const selectedFiles = hardcopyFilenames.filter((_, i) => newSelected[i] || i === index);
      onFilenamesChange(selectedFiles);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="px-6 py-6 bg-gray-50 border-t border-b border-gray-200">
      {/* Photographer Code Input */}
      {!sessionStarted && (
        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <label className="block text-sm text-gray-600 mb-2">
            <span className="text-xs font-bold text-green-600 block mb-1 uppercase tracking-wider">
              {photographerName
                ? `${photographerName} ${photographerPhone || ''} is on the way`
                : 'PHOTOGRAPHER IS ON THE WAY'}
            </span>
            <span className="text-gray-500 text-xs">Enter code from photographer to start:</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={photographerCode}
              onChange={(e) => setPhotographerCode(e.target.value)}
              placeholder="0000"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <button
              onClick={handleStartSession}
              disabled={!isCodeValid()}
              className={`px-6 py-3 rounded-lg transition-all font-medium shadow-md active:scale-95 ${isCodeValid()
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Timer & Extensions Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4 relative overflow-hidden">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Session Timer</h3>
            <p className="text-xs text-gray-500">Base: {baseTime} min</p>
          </div>
          <div className="flex gap-1.5 bg-gray-50 p-1 rounded-lg">
            {[5, 10].map((mins) => (
              <button
                key={mins}
                onClick={() => handleExtension(mins)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedExtension === mins
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                  }`}
              >
                +{mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Circular Timer */}
        <div className="flex justify-center mb-6 relative">
          {/* Dynamic Price Tag for Extension */}
          {selectedExtension > 0 && (
            <div className="absolute top-0 right-10 bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full animate-in fade-in zoom-in">
              +₹{selectedExtension === 5 ? 75 : 150}
            </div>
          )}

          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle
                cx="80" cy="80" r="70" fill="none"
                stroke={timeRemaining === 0 ? '#ef4444' : '#111827'}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - timeRemaining / (baseTime * 60))}`}
                className={`transition-all duration-1000 ${timeRemaining === 0 ? 'animate-pulse' : ''}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`text-5xl font-bold tracking-tighter ${timeRemaining === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                {formatTime(timeRemaining)}
              </div>
              <div className={`text-xs font-medium uppercase tracking-wide mt-1 ${timeRemaining === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {timeRemaining === 0 ? 'Time Up' : sessionStarted ? 'Remaining' : 'Ready'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardcopy Control Card */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Hardcopies</h3>
            <p className="text-xs text-gray-500">₹39 per extra copy</p>
          </div>
          <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200">
            <button
              onClick={() => handleHardcopyChange(-1)}
              disabled={hardcopyCount <= getIncludedHardcopies()}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <div className="w-8 text-center font-semibold text-sm">{hardcopyCount}</div>
            <button
              onClick={() => handleHardcopyChange(1)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {hardcopyFilenames.map((filename, index) => (
            <div key={index} className="flex gap-2 animate-in fade-in slide-in-from-top-1">
              <input
                type="text"
                value={filename}
                onChange={(e) => handleFilenameChange(index, e.target.value)}
                placeholder={`Filename ${index + 1} (e.g. IMG_1234)`}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all"
              />
              <button
                onClick={() => handleSelectFilename(index)}
                disabled={filename.trim() === '' || selectedFilenames[index]}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${selectedFilenames[index]
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : filename.trim() === ''
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-black text-white hover:bg-gray-800'
                  }`}
              >
                {selectedFilenames[index] ? 'Saved' : 'Save'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Session Details Receipt */}
      <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300 mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-2">
          <span>Base Package (5m + 1 copy)</span>
          <span className="font-medium">₹99</span>
        </div>

        {selectedExtension > 0 && (
          <div className="flex justify-between text-xs text-gray-600 mb-2 animate-in slide-in-from-left-2">
            <span>Extra Time (+{selectedExtension} min)</span>
            <span className="font-medium">₹{calculatePrice(selectedExtension) - 99}</span>
          </div>
        )}

        {getAdditionalHardcopies() > 0 && (
          <div className="flex justify-between text-xs text-gray-600 mb-2 animate-in slide-in-from-left-2">
            <span>Extra Copies ({getAdditionalHardcopies()} x ₹39)</span>
            <span className="font-medium">₹{getAdditionalHardcopies() * 39}</span>
          </div>
        )}

        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-lg font-bold text-gray-900">₹{getTotalPrice()}</span>
        </div>
      </div>

      {/* Simplified Info Note */}
      <div className="mt-4 bg-gray-50 border border-gray-100 rounded-lg p-3 text-[10px] text-gray-500 italic text-center leading-tight">
        Sessions are extended & Hard copy count increased independently.
      </div>

      {/* Venue Instructions - Below the timer */}
      <div className="mt-6">
        <VenueInstructions
          expanded={expandedVenueInstructions}
          onToggle={onToggleVenueInstructions}
          venue={venue}
        />
      </div>
    </div>
  );
}