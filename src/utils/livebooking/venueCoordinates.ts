// Venue coordinates mapping
// Format: Loaded from public/venues.json
// Supports smart location detection and automatic venue matching

export interface VenueCoordinates {
  lat: number;
  lng: number;
}

export interface VenueInfo {
  id: string;
  name: string;
  coordinates: VenueCoordinates;
  maxDistanceMeters: number;
  aliases?: string[];
  phone?: string;
  address?: string;
  instructions?: string[];
  photographerCode?: string[];
}

export interface VenuesData {
  venues: VenueInfo[];
  defaultMaxDistanceMeters: number;
}

export interface VenueMatch {
  venue: VenueInfo;
  distance: number; // in meters
}

// Cache for loaded venues data
let venuesDataCache: VenuesData | null = null;
let venuesLoadPromise: Promise<VenuesData> | null = null;

// Load venues from JSON file in public folder
async function loadVenuesFromJSON(): Promise<VenuesData> {
  // Return cached data if available
  if (venuesDataCache) {
    return venuesDataCache;
  }

  // Return existing promise if load is in progress
  if (venuesLoadPromise) {
    return venuesLoadPromise;
  }

  // Create new load promise
  venuesLoadPromise = (async () => {
    try {
      const response = await fetch('/venues.json');
      if (!response.ok) {
        throw new Error(`Failed to load venues.json: ${response.statusText}`);
      }
      const data: VenuesData = await response.json();
      
      // Validate data structure
      if (!data.venues || !Array.isArray(data.venues)) {
        throw new Error('Invalid venues.json structure: venues array is required');
      }
      if (typeof data.defaultMaxDistanceMeters !== 'number') {
        throw new Error('Invalid venues.json structure: defaultMaxDistanceMeters is required');
      }

      // Cache the loaded data
      venuesDataCache = data;
      return data;
    } catch (error) {
      console.error('Error loading venues.json:', error);
      // Return empty structure on error
      const fallback: VenuesData = {
        venues: [],
        defaultMaxDistanceMeters: 500
      };
      venuesDataCache = fallback;
      return fallback;
    } finally {
      venuesLoadPromise = null;
    }
  })();

  return venuesLoadPromise;
}

// Get venues data (synchronous access to cache, async load if needed)
export async function getVenuesData(): Promise<VenuesData> {
  if (venuesDataCache) {
    return venuesDataCache;
  }
  return await loadVenuesFromJSON();
}

// Get all venues (for backward compatibility and AvailableVenues component)
export async function getAllVenues(): Promise<VenueInfo[]> {
  const data = await getVenuesData();
  return data.venues;
}

// Create a mapping of venue names to VenueInfo for backward compatibility
let venueNameMapCache: Record<string, VenueInfo> | null = null;

async function getVenueNameMap(): Promise<Record<string, VenueInfo>> {
  if (venueNameMapCache) {
    return venueNameMapCache;
  }

  const venues = await getAllVenues();
  const map: Record<string, VenueInfo> = {};

  venues.forEach(venue => {
    // Map by canonical name
    map[venue.name] = venue;
    
    // Map by aliases
    if (venue.aliases) {
      venue.aliases.forEach(alias => {
        map[alias] = venue;
      });
    }
  });

  venueNameMapCache = map;
  return map;
}

// Helper function to normalize venue name for matching
function normalizeVenueName(name: string): string {
  return name.trim().toLowerCase();
}

// Find venue by name (with fuzzy matching) - for QR code compatibility
export async function findVenueByName(venueName: string): Promise<VenueInfo | null> {
  const nameMap = await getVenueNameMap();
  const normalized = normalizeVenueName(venueName);

  // Try exact match (case-insensitive)
  const exactMatch = Object.keys(nameMap).find(name => 
    normalizeVenueName(name) === normalized
  );
  if (exactMatch) {
    return nameMap[exactMatch];
  }

  // Try partial/fuzzy matching
  const fuzzyMatch = Object.keys(nameMap).find(name => {
    const nameLower = normalizeVenueName(name);
    return nameLower.includes(normalized) || normalized.includes(nameLower);
  });

  if (fuzzyMatch) {
    return nameMap[fuzzyMatch];
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

// Get closest venue to user coordinates
export async function getClosestVenue(
  userLat: number,
  userLng: number
): Promise<VenueMatch | null> {
  const venues = await getAllVenues();
  
  if (venues.length === 0) {
    return null;
  }

  let closest: VenueMatch | null = null;
  let minDistance = Infinity;

  venues.forEach(venue => {
    const distance = calculateDistance(
      userLat,
      userLng,
      venue.coordinates.lat,
      venue.coordinates.lng
    );

    if (distance < minDistance) {
      minDistance = distance;
      closest = {
        venue,
        distance
      };
    }
  });

  return closest;
}

// Get all venues within specified distance
export async function getVenuesWithinRange(
  userLat: number,
  userLng: number,
  maxDistanceMeters: number
): Promise<VenueMatch[]> {
  const venues = await getAllVenues();
  const matches: VenueMatch[] = [];

  venues.forEach(venue => {
    const distance = calculateDistance(
      userLat,
      userLng,
      venue.coordinates.lat,
      venue.coordinates.lng
    );

    if (distance <= maxDistanceMeters) {
      matches.push({
        venue,
        distance
      });
    }
  });

  // Sort by distance (closest first)
  matches.sort((a, b) => a.distance - b.distance);
  return matches;
}

// Check if user is within specified distance (in meters) of venue
// Backward compatibility function - now async
export async function isWithinRange(
  userLat: number,
  userLng: number,
  venueName: string,
  maxDistanceMeters?: number
): Promise<boolean> {
  const venue = await findVenueByName(venueName);
  if (!venue) {
    return false; // Venue not found
  }

  const distance = calculateDistance(
    userLat,
    userLng,
    venue.coordinates.lat,
    venue.coordinates.lng
  );

  // Use provided maxDistance or venue-specific or default
  const maxDistance = maxDistanceMeters ?? venue.maxDistanceMeters ?? 500;
  return distance <= maxDistance;
}

// Get venue coordinates by name (backward compatibility)
// Returns coordinates only, not full venue info
export async function getVenueCoordinates(venueName: string): Promise<VenueCoordinates | null> {
  const venue = await findVenueByName(venueName);
  return venue ? venue.coordinates : null;
}

// Backward compatibility: VENUE_COORDINATES proxy
// This maintains compatibility with existing code that expects synchronous access
// Note: This will return empty initially and populate after first async load
let venueCoordinatesProxyCache: Record<string, VenueCoordinates> = {};

// Initialize the proxy cache from venues data
async function initializeVenueCoordinatesProxy() {
  if (Object.keys(venueCoordinatesProxyCache).length > 0) {
    return; // Already initialized
  }

  try {
    const venues = await getAllVenues();
    const proxy: Record<string, VenueCoordinates> = {};
    
    venues.forEach(venue => {
      proxy[venue.name] = venue.coordinates;
      // Also add aliases
      if (venue.aliases) {
        venue.aliases.forEach(alias => {
          proxy[alias] = venue.coordinates;
        });
      }
    });

    venueCoordinatesProxyCache = proxy;
  } catch (error) {
    console.error('Error initializing venue coordinates proxy:', error);
  }
}

// Initialize on first access (fire and forget)
if (typeof window !== 'undefined') {
  initializeVenueCoordinatesProxy();
}

export const VENUE_COORDINATES: Record<string, VenueCoordinates> = new Proxy({} as Record<string, VenueCoordinates>, {
  get(target, prop) {
    const key = prop as string;
    // Return from cache if available
    if (venueCoordinatesProxyCache[key]) {
      return venueCoordinatesProxyCache[key];
    }
    // Trigger async initialization if not done
    if (Object.keys(venueCoordinatesProxyCache).length === 0) {
      initializeVenueCoordinatesProxy();
    }
    return undefined;
  },
  ownKeys(target) {
    return Object.keys(venueCoordinatesProxyCache);
  },
  has(target, prop) {
    return prop in venueCoordinatesProxyCache;
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop in venueCoordinatesProxyCache) {
      return {
        enumerable: true,
        configurable: true,
        value: venueCoordinatesProxyCache[prop as string]
      };
    }
    return undefined;
  }
});

// Backward compatibility: VENUE_NAME_MAPPINGS
// Build mappings from aliases
let venueNameMappingsCache: Record<string, string> | null = null;

async function getVenueNameMappings(): Promise<Record<string, string>> {
  if (venueNameMappingsCache) {
    return venueNameMappingsCache;
  }

  const venues = await getAllVenues();
  const mappings: Record<string, string> = {};

  venues.forEach(venue => {
    // Map canonical name (case-insensitive)
    mappings[venue.name.toLowerCase()] = venue.name;
    
    // Map aliases to canonical name
    if (venue.aliases) {
      venue.aliases.forEach(alias => {
        mappings[alias.toLowerCase()] = venue.name;
      });
    }
  });

  venueNameMappingsCache = mappings;
  return mappings;
}

// Initialize mappings (fire and forget)
if (typeof window !== 'undefined') {
  getVenueNameMappings();
}

export const VENUE_NAME_MAPPINGS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(target, prop) {
    const key = prop as string;
    if (venueNameMappingsCache && venueNameMappingsCache[key]) {
      return venueNameMappingsCache[key];
    }
    // Trigger async load if not done
    if (!venueNameMappingsCache) {
      getVenueNameMappings();
    }
    return undefined;
  },
  ownKeys(target) {
    return venueNameMappingsCache ? Object.keys(venueNameMappingsCache) : [];
  },
  has(target, prop) {
    return venueNameMappingsCache ? prop in venueNameMappingsCache : false;
  },
  getOwnPropertyDescriptor(target, prop) {
    if (venueNameMappingsCache && prop in venueNameMappingsCache) {
      return {
        enumerable: true,
        configurable: true,
        value: venueNameMappingsCache[prop as string]
      };
    }
    return undefined;
  }
});
