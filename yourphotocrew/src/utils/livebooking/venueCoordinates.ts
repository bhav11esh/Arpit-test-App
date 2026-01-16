// Venue coordinates mapping
// Format: { venueName: { lat: number, lng: number } }
// Coordinates are loaded from environment variables

export interface VenueCoordinates {
  lat: number;
  lng: number;
}

// Helper function to convert venue name to env variable key format
function venueNameToEnvKey(venueName: string): string {
  return venueName.toUpperCase().replace(/\s+/g, '_');
}

// Helper to get env variable (supports both Vite and Next.js formats for compatibility)
function getEnvVar(key: string): string | undefined {
  // Try Vite format first (for compatibility with Vite-based tools)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const viteKey = `VITE_${key}`;
      if (import.meta.env[viteKey]) {
        return import.meta.env[viteKey];
      }
    }
  } catch (e) {
    // import.meta not available
  }
  
  // Try Next.js format (primary format for this app)
  try {
    // @ts-ignore - process may not exist in browser environment
    if (typeof process !== 'undefined' && process.env) {
      const nextKey = `NEXT_PUBLIC_${key}`;
      // @ts-ignore
      if (process.env[nextKey]) {
        // @ts-ignore
        return process.env[nextKey];
      }
      // Also try without NEXT_PUBLIC_ prefix for direct access
      // @ts-ignore
      if (process.env[key]) {
        // @ts-ignore
        return process.env[key];
      }
    }
  } catch (e) {
    // process not available in browser
  }
  return undefined;
}

// Load venue coordinates from environment variables
function loadVenueCoordinates(): Record<string, VenueCoordinates> {
  const coordinates: Record<string, VenueCoordinates> = {};
  
  // Get all environment variables that start with VITE_VENUE_ or NEXT_PUBLIC_VENUE_
  let viteEnvKeys: string[] = [];
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // Check if Object.keys works
      try {
        const allViteKeys = Object.keys(import.meta.env);
        viteEnvKeys = allViteKeys.filter(key => 
          key.startsWith('VITE_VENUE_') && key.endsWith('_LAT')
        );
      } catch (keysError) {
        // Object.keys doesn't work - try direct access
      }
    }
  } catch (e) {
    // import.meta not available or error accessing it
  }
  
  let nextEnvKeys: string[] = [];
  try {
    // @ts-ignore - process may not exist in browser environment
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      const env = process.env;
      if (env && typeof env === 'object') {
        // Try to get keys - this may not work in Next.js browser context
        try {
          // @ts-ignore
          const allKeys = Object.keys(env);
          // @ts-ignore
          nextEnvKeys = Object.keys(env).filter((key: string) =>
            key.startsWith('NEXT_PUBLIC_VENUE_') && key.endsWith('_LAT')
          );
        } catch (keysError) {
          // Object.keys doesn't work in Next.js browser - try direct access
        }
      }
    }
  } catch (e) {
    // process not available in browser or error accessing it
  }
  
  const allEnvKeys = [...viteEnvKeys, ...nextEnvKeys];
  
  // If no env keys found via enumeration, try fallback with direct access to known venues
  if (allEnvKeys.length === 0) {
    // Fallback: Try to read from env directly with known keys (both formats)
    // This works in Next.js where Object.keys() doesn't work but direct access does
    const knownVenues = ['HOLE_IN_THE_WALL_CAFE']; // Add more as needed
    
    for (const venueKey of knownVenues) {
      // Try multiple formats - direct access to all possible env var names
      let latValue: string | undefined;
      let lngValue: string | undefined;
      
      // Try VITE_ prefix directly via import.meta.env
      try {
        if (typeof import.meta !== 'undefined' && import.meta.env) {
          const viteLatKey = `VITE_VENUE_${venueKey}_LAT`;
          const viteLngKey = `VITE_VENUE_${venueKey}_LNG`;
          latValue = import.meta.env[viteLatKey];
          lngValue = import.meta.env[viteLngKey];
        }
      } catch (e) {}
      
      // Try NEXT_PUBLIC_ prefix directly via process.env
      // In Next.js, these are replaced at build time, so we need to access them directly
      if (!latValue || !lngValue) {
        try {
          // @ts-ignore
          if (typeof process !== 'undefined' && process.env) {
            // Try dynamic key access first
            const nextLatKey = `NEXT_PUBLIC_VENUE_${venueKey}_LAT`;
            const nextLngKey = `NEXT_PUBLIC_VENUE_${venueKey}_LNG`;
            // @ts-ignore
            const dynamicLat = process.env[nextLatKey];
            // @ts-ignore
            const dynamicLng = process.env[nextLngKey];
            
            // Also try direct literal access for known venues (Next.js build-time replacement)
            // For HOLE_IN_THE_WALL_CAFE, try the literal key
            let literalLat: string | undefined;
            let literalLng: string | undefined;
            if (venueKey === 'HOLE_IN_THE_WALL_CAFE') {
              // @ts-ignore - Next.js replaces these at build time
              literalLat = process.env.NEXT_PUBLIC_VENUE_HOLE_IN_THE_WALL_CAFE_LAT;
              // @ts-ignore
              literalLng = process.env.NEXT_PUBLIC_VENUE_HOLE_IN_THE_WALL_CAFE_LNG;
            }
            
            latValue = latValue || dynamicLat || literalLat;
            lngValue = lngValue || dynamicLng || literalLng;
          }
        } catch (e) {
          // Error accessing process.env
        }
      }
      
      if (latValue && lngValue) {
        const lat = parseFloat(latValue);
        const lng = parseFloat(lngValue);
        if (!isNaN(lat) && !isNaN(lng)) {
          // Format venue name properly
          const venueNameKey = venueKey.replace(/^VENUE_/, '');
          const lowercaseWords = new Set(['in', 'the', 'of', 'at', 'on', 'and', 'or', 'a', 'an']);
          const venueName = venueNameKey
            .split('_')
            .map((word, index) => {
              const lowerWord = word.toLowerCase();
              if (index === 0) {
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              }
              if (lowercaseWords.has(lowerWord)) {
                return lowerWord;
              }
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
          coordinates[venueName] = { lat, lng };
        }
      }
    }
  }
  
  // Extract venue names and their coordinates
  allEnvKeys.forEach(latKey => {
    // Remove prefix to get base key
    const baseKey = latKey.replace(/^(VITE_|NEXT_PUBLIC_)/, '').replace('_LAT', '');
    const venueKey = baseKey;
    const lngKey = baseKey + '_LNG';
    
    // Get values using helper function
    const latValue = getEnvVar(venueKey + '_LAT');
    const lngValue = getEnvVar(venueKey + '_LNG');
    
    const lat = latValue ? parseFloat(latValue) : NaN;
    const lng = lngValue ? parseFloat(lngValue) : NaN;
    
    if (!isNaN(lat) && !isNaN(lng)) {
      // Convert env key back to venue name (e.g., VENUE_HOLE_IN_THE_WALL_CAFE -> Hole in the Wall Cafe)
      // Remove VENUE_ prefix if present
      const venueNameKey = venueKey.replace(/^VENUE_/, '');
      
      // Words that should remain lowercase (except if first word)
      const lowercaseWords = new Set(['in', 'the', 'of', 'at', 'on', 'and', 'or', 'a', 'an']);
      
      const venueName = venueNameKey
        .split('_')
        .map((word, index) => {
          const lowerWord = word.toLowerCase();
          // First word is always capitalized, others follow title case rules
          if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
          // Keep common words lowercase
          if (lowercaseWords.has(lowerWord)) {
            return lowerWord;
          }
          // Capitalize other words
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
      
      coordinates[venueName] = { lat, lng };
    }
  });
  
  return coordinates;
}

// Lazy initialization - cache the result to avoid reloading and ensure we use the successful load
let venueCoordinatesCache: Record<string, VenueCoordinates> | null = null;

function getVenueCoordinatesMap(): Record<string, VenueCoordinates> {
  if (venueCoordinatesCache !== null && Object.keys(venueCoordinatesCache).length > 0) {
    return venueCoordinatesCache;
  }
  
  // Try to load coordinates
  try {
    const loaded = loadVenueCoordinates();
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded) && Object.keys(loaded).length > 0) {
      venueCoordinatesCache = loaded;
      return venueCoordinatesCache;
    }
  } catch (e) {
    // Error loading coordinates
  }
  
  // If loading failed or returned empty, initialize to empty object (but don't cache it)
  if (venueCoordinatesCache === null) {
    venueCoordinatesCache = {};
  }
  return venueCoordinatesCache;
}

// Export as a getter to ensure lazy loading - only loads when first accessed
export const VENUE_COORDINATES: Record<string, VenueCoordinates> = new Proxy({} as Record<string, VenueCoordinates>, {
  get(target, prop) {
    const map = getVenueCoordinatesMap();
    return map[prop as string];
  },
  ownKeys(target) {
    return Object.keys(getVenueCoordinatesMap());
  },
  has(target, prop) {
    return prop in getVenueCoordinatesMap();
  },
  getOwnPropertyDescriptor(target, prop) {
    const map = getVenueCoordinatesMap();
    if (prop in map) {
      return {
        enumerable: true,
        configurable: true,
        value: map[prop as string]
      };
    }
    return undefined;
  }
});

// Load venue name mappings from environment variables
// Format: VITE_VENUE_MAPPING_<VENUE_KEY>=alias1,alias2,alias3
// Example: VITE_VENUE_MAPPING_HOLE_IN_THE_WALL_CAFE=HITW,Hole in the Wall,Hole in Wall Cafe
function loadVenueMappings(): Record<string, string> {
  const mappings: Record<string, string> = {};
  
  // First, add direct mappings for all venue names (case-insensitive)
  if (VENUE_COORDINATES && typeof VENUE_COORDINATES === 'object') {
    Object.keys(VENUE_COORDINATES).forEach(venueName => {
      mappings[venueName.toLowerCase()] = venueName;
    });
  }
  
  // Get all environment variables that start with VITE_VENUE_MAPPING_ or NEXT_PUBLIC_VENUE_MAPPING_
  let viteMappingKeys: string[] = [];
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof Object.keys === 'function') {
      viteMappingKeys = Object.keys(import.meta.env).filter(key => 
        key.startsWith('VITE_VENUE_MAPPING_')
      );
    }
  } catch (e) {
    // import.meta not available
  }
  
  let nextMappingKeys: string[] = [];
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && typeof Object.keys === 'function') {
      // @ts-ignore
      const env = process.env;
      if (env && typeof env === 'object') {
        // @ts-ignore
        nextMappingKeys = Object.keys(env).filter((key: string) =>
          key.startsWith('NEXT_PUBLIC_VENUE_MAPPING_')
        );
      }
    }
  } catch (e) {
    // process not available
  }
  
  const allMappingKeys = [...viteMappingKeys, ...nextMappingKeys];
  
  allMappingKeys.forEach(mappingKey => {
    // Remove prefix to get base key (e.g., VITE_VENUE_MAPPING_HOLE_IN_THE_WALL_CAFE -> HOLE_IN_THE_WALL_CAFE)
    const baseKey = mappingKey.replace(/^(VITE_|NEXT_PUBLIC_)VENUE_MAPPING_/, '');
    
    // Find the canonical venue name by matching the base key to venue coordinates
    // Convert base key to potential venue name format and find matching venue
    const canonicalName = Object.keys(VENUE_COORDINATES).find(name => {
      const nameKey = name.toUpperCase().replace(/\s+/g, '_');
      // Match if the base key matches the venue name key
      return nameKey === baseKey;
    });
    
    if (canonicalName) {
      // Get mapping value from env
      let mappingValue: string | undefined;
      if (typeof import.meta !== 'undefined' && import.meta.env[mappingKey]) {
        mappingValue = import.meta.env[mappingKey];
      } else {
        try {
          // @ts-ignore
          if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            mappingValue = process.env[mappingKey];
          }
        } catch (e) {
          // process not available
        }
      }
      
      if (mappingValue) {
        // Split by comma and create mappings for each alias
        const aliases = mappingValue.split(',').map(a => a.trim()).filter(a => a.length > 0);
        aliases.forEach(alias => {
          mappings[alias.toLowerCase()] = canonicalName;
        });
      }
    }
  });
  
  return mappings;
}

export const VENUE_NAME_MAPPINGS: Record<string, string> = loadVenueMappings();

// Helper function to normalize venue name for matching
function normalizeVenueName(name: string): string {
  return name.trim().toLowerCase();
}

// Helper function to get venue coordinates by name (with fuzzy matching)
export function getVenueCoordinates(venueName: string): VenueCoordinates | null {
  // Try exact match first
  if (VENUE_COORDINATES[venueName]) {
    return VENUE_COORDINATES[venueName];
  }
  
  // Try case-insensitive match via mappings
  const normalized = normalizeVenueName(venueName);
  const mappedName = VENUE_NAME_MAPPINGS[normalized];
  
  if (mappedName && VENUE_COORDINATES[mappedName]) {
    return VENUE_COORDINATES[mappedName];
  }
  
  // Try case-insensitive direct match
  const caseInsensitiveMatch = Object.keys(VENUE_COORDINATES).find(name => {
    return normalizeVenueName(name) === normalized;
  });
  
  if (caseInsensitiveMatch) {
    return VENUE_COORDINATES[caseInsensitiveMatch];
  }
  
  // Try partial/fuzzy matching
  const matchedVenue = Object.keys(VENUE_COORDINATES).find(name => {
    const nameLower = normalizeVenueName(name);
    const inputLower = normalized;
    // Check if input contains venue name or venue name contains input
    return nameLower.includes(inputLower) || inputLower.includes(nameLower);
  });
  
  if (matchedVenue) {
    return VENUE_COORDINATES[matchedVenue];
  }
  
  return null;
}

// Calculate distance between two coordinates using Haversine formula
// Returns distance in meters
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Check if user is within specified distance (in meters) of venue
export function isWithinRange(
  userLat: number,
  userLng: number,
  venueName: string,
  maxDistanceMeters: number = 500
): boolean {
  const venueCoords = getVenueCoordinates(venueName);
  if (!venueCoords) {
    return false; // Venue not found in mapping
  }
  
  const distance = calculateDistance(
    userLat,
    userLng,
    venueCoords.lat,
    venueCoords.lng
  );
  
  return distance <= maxDistanceMeters;
}

