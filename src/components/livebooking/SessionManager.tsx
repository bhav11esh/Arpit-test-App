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
}

export function SessionManager({ onPriceChange, venue, expandedVenueInstructions, onToggleVenueInstructions, onCodeApplied, onFilenamesComplete, onFilenamesChange }: SessionManagerProps) {
  const [photographerCode, setPhotographerCode] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [baseTime, setBaseTime] = useState(20); // in minutes
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // in seconds
  const [selectedExtension, setSelectedExtension] = useState<number>(0); // 0, 5, 10, or 20
  const [hardcopyCount, setHardcopyCount] = useState(1); // Start with 1 hardcopy (base package)
  const [hardcopyFilenames, setHardcopyFilenames] = useState<string[]>(['']); // Array of filenames
  const [selectedFilenames, setSelectedFilenames] = useState<boolean[]>([false]); // Track which filenames are confirmed
  const [venueInfo, setVenueInfo] = useState<VenueInfo | null>(null);

  // Calculate total price based on extensions
  const calculatePrice = (extensionMinutes: number) => {
    if (extensionMinutes === 0) return 299;
    if (extensionMinutes === 5) return 399;
    if (extensionMinutes === 10) return 499;
    if (extensionMinutes === 20) return 598;
    return 299; // fallback
  };

  // Calculate number of included hardcopies based on extensions
  const getIncludedHardcopies = () => {
    return selectedExtension === 20 ? 2 : 1; // Base (1) + bonus from +20min (1)
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
    
    const validCodes = getValidCodes();
    return validCodes.includes(enteredCode);
  };

  // Timer countdown - only starts when sessionStarted is true
  useEffect(() => {
    if (!sessionStarted) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
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
      setBaseTime(20);
      setTimeRemaining((prev) => Math.max(0, prev - (minutes * 60)));
      
      // If deselecting +20 min, reduce hardcopy count by 1
      if (minutes === 20) {
        setHardcopyCount((prev) => Math.max(1, prev - 1));
      }
    } else {
      // Check if trying to switch to a smaller extension
      if (minutes < selectedExtension && currentTimeInMinutes < minutes) {
        return; // Block switching to smaller extension if time remaining is less than new extension
      }
      
      // Select new extension - add the difference in time
      const timeDifference = minutes - selectedExtension;
      setSelectedExtension(minutes);
      setBaseTime(20 + minutes);
      setTimeRemaining((prev) => Math.max(0, prev + (timeDifference * 60)));
      
      // If selecting +20 min (from any other state), increase hardcopy count by 1
      if (minutes === 20) {
        setHardcopyCount((prev) => prev + 1);
      }
      // If switching from +20 to something else (5 or 10), reduce hardcopy count by 1
      if (selectedExtension === 20 && minutes !== 20) {
        setHardcopyCount((prev) => Math.max(1, prev - 1));
      }
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
        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-2">
            <span className="text-xs" style={{ fontStyle: 'italic !important' }}>If you have sent the request text through whatsapp messenger the photographer must has been notified and is on the way.</span>
            <br />
            <br />
            Code to be entered by photographer to start timer
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={photographerCode}
              onChange={(e) => setPhotographerCode(e.target.value)}
              placeholder="Enter code"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={handleStartSession}
              disabled={!isCodeValid()}
              className={`px-6 py-3 rounded-lg transition-colors font-medium ${
                isCodeValid()
                  ? 'bg-black text-white hover:bg-gray-800 cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start
            </button>
          </div>
        </div>
      )}

      {/* Session Time Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <div>
            <span className="font-medium">Session: {baseTime} min</span>
          </div>
        </div>

        {/* Extension Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleExtension(5)}
            className={`px-3 py-2 border rounded-lg text-sm transition-colors flex items-center gap-1 text-[13px] ${
              selectedExtension === 5
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            5 min
          </button>
          <button
            onClick={() => handleExtension(10)}
            className={`px-3 py-2 border rounded-lg text-sm transition-colors flex items-center gap-1 text-[13px] ${
              selectedExtension === 10
                ? 'bg-black text-white border-black'
                : 'border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Plus className="w-4 h-4" />
            10 min
          </button>
          <div className="flex flex-col items-center">
            <button
              onClick={() => handleExtension(20)}
              className={`px-3 py-2 border rounded-lg text-sm transition-colors flex items-center gap-1 text-[13px] ${
                selectedExtension === 20
                  ? 'bg-black text-white border-black'
                  : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              20 min
            </button>
            <span className="text-[10px] text-gray-600 italic mt-0.5">+1 hardcopy</span>
          </div>
        </div>
      </div>

      {/* Countdown Timer Display - Always visible */}
      <div className="flex justify-center my-6">
        <div className="relative w-40 h-40">
          {/* Circular Progress Background */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={timeRemaining === 0 ? '#ef4444' : '#000000'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${2 * Math.PI * 70 * (1 - timeRemaining / (baseTime * 60))}`}
              className={`transition-all duration-1000 ${timeRemaining === 0 ? 'animate-pulse' : ''}`}
            />
          </svg>
          {/* Timer Text in Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Clock className={`w-8 h-8 mb-2 ${timeRemaining === 0 ? 'text-red-500' : 'text-gray-400'}`} />
            <div className={`text-3xl font-bold ${timeRemaining === 0 ? 'text-red-500' : 'text-black'}`}>
              {formatTime(timeRemaining)}
            </div>
            <div className={`text-xs mt-1 ${timeRemaining === 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {timeRemaining === 0 ? 'Time up!' : sessionStarted ? 'remaining' : 'ready to start'}
            </div>
          </div>
        </div>
      </div>

      {/* Hardcopy Count Control */}
      <div className="mt-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">Hardcopy Count:</span>
          <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-3 py-1.5">
            <button
              onClick={() => handleHardcopyChange(-1)}
              disabled={hardcopyCount <= getIncludedHardcopies()}
              className="text-gray-600 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-medium min-w-[20px] text-center">{hardcopyCount}</span>
            <button
              onClick={() => handleHardcopyChange(1)}
              className="text-gray-600 hover:text-black"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filename Input for Hardcopies */}
        <div className="mt-3 space-y-2">
          {hardcopyFilenames.map((filename, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={filename}
                onChange={(e) => handleFilenameChange(index, e.target.value)}
                placeholder={`Filename ${index + 1}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm"
              />
              <button
                onClick={() => handleSelectFilename(index)}
                disabled={filename.trim() === '' || selectedFilenames[index]}
                className={`px-4 py-2 border rounded-lg text-sm transition-colors whitespace-nowrap ${
                  selectedFilenames[index]
                    ? 'bg-black text-white border-black cursor-default'
                    : filename.trim() === ''
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 hover:bg-gray-100 cursor-pointer'
                }`}
              >
                {selectedFilenames[index] ? 'Selected' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Session Details */}
      <div className="mt-4 pt-4 border-t border-gray-300 text-sm text-gray-600">
        <div className="flex justify-between mb-1">
          <span>Base package (20 min session + 1 hard copy):</span>
          <span>₹299</span>
        </div>
        {selectedExtension > 0 && (
          <div className="flex justify-between mb-1">
            <span>Extension (+{selectedExtension} min{selectedExtension === 20 ? ' + 1 hard copy' : ''}):</span>
            <span>₹{calculatePrice(selectedExtension) - 299}</span>
          </div>
        )}
        {getAdditionalHardcopies() > 0 && (
          <div className="flex justify-between mb-1">
            <span>Additional hard copies ({getAdditionalHardcopies()}):</span>
            <span>₹{getAdditionalHardcopies() * 39}</span>
          </div>
        )}
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