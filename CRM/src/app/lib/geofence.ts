import type { Delivery, GeofenceBreach } from '../types';

// Mock showroom locations (latitude, longitude)
const SHOWROOM_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  'KHTR_WH': { lat: 28.4595, lng: 77.0266 }, // Gurgaon
  'DLF_PH3': { lat: 28.4989, lng: 77.0909 }, // DLF Phase 3
  'MGF_MET': { lat: 28.4817, lng: 77.0873 }, // MGF Metropolitan
  'VAS_MALL': { lat: 28.5494, lng: 77.2500 }, // Vasant Kunj
  'SAK_CENT': { lat: 28.5355, lng: 77.2467 }, // Saket
};

const GEOFENCE_RADIUS_METERS = 500; // 500 meters radius

// V1 SPEC: Track which delivery-time pairs have already been checked
// Ensures alerts fire only once per delivery
const checkedDeliveries = new Set<string>();

function getDeliveryTimeKey(deliveryId: string, timing: string): string {
  return `${deliveryId}_${timing}`;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Request geolocation permission and get current position
 */
export async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

/**
 * Check if user is within geofence for a delivery
 */
export async function checkGeofence(
  delivery: Delivery,
  userId: string
): Promise<{ inGeofence: boolean; breach: GeofenceBreach | null }> {
  try {
    const position = await getCurrentPosition();
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    const showroomLocation = SHOWROOM_LOCATIONS[delivery.showroom_code];
    
    if (!showroomLocation) {
      console.warn(`No location found for showroom: ${delivery.showroom_code}`);
      return { inGeofence: true, breach: null }; // Allow if no location configured
    }

    const distance = calculateDistance(
      userLat,
      userLng,
      showroomLocation.lat,
      showroomLocation.lng
    );

    const inGeofence = distance <= GEOFENCE_RADIUS_METERS;

    if (!inGeofence) {
      const breach: GeofenceBreach = {
        id: `gb_${Date.now()}`,
        delivery_id: delivery.id,
        user_id: userId,
        latitude: userLat,
        longitude: userLng,
        expected_time: `${delivery.date}T${delivery.timing}`,
        breach_time: new Date().toISOString(),
        distance_from_target: Math.round(distance),
      };

      return { inGeofence: false, breach };
    }

    return { inGeofence: true, breach: null };
  } catch (error) {
    console.error('Geofence check failed:', error);
    // Don't block delivery if geolocation fails
    return { inGeofence: true, breach: null };
  }
}

/**
 * Calculate time until T-15 minutes for a delivery
 * Returns milliseconds until check time, or null if no timing set
 */
export function getTimeUntilGeofenceCheck(delivery: Delivery): number | null {
  if (!delivery.timing) return null;

  const [hours, minutes] = delivery.timing.split(':').map(Number);
  const deliveryDateTime = new Date(delivery.date);
  deliveryDateTime.setHours(hours, minutes, 0, 0);

  // T-15 minutes
  const checkTime = new Date(deliveryDateTime.getTime() - 15 * 60 * 1000);
  const now = new Date();

  const timeUntilCheck = checkTime.getTime() - now.getTime();

  // Return null if check time has passed
  return timeUntilCheck > 0 ? timeUntilCheck : null;
}

/**
 * Schedule geofence check for a delivery
 * V1 SPEC: Geofence alert is scheduler-driven and idempotent per delivery-time pair
 * - Fires ONLY ONCE per (delivery_id + timing) combination
 * - Timing updates reset eligibility (cleanup removes from checked set)
 * - UI reflects scheduler result (not UI-driven)
 * Returns cleanup function to cancel the scheduled check
 */
export function scheduleGeofenceCheck(
  delivery: Delivery,
  userId: string,
  onBreachDetected: (breach: GeofenceBreach) => void
): (() => void) | null {
  const timeUntilCheck = getTimeUntilGeofenceCheck(delivery);

  if (timeUntilCheck === null) {
    return null;
  }

  // V1 SPEC: Only check each delivery-time pair once
  // Key format: deliveryId_timing (e.g., "d1_14:30")
  const key = getDeliveryTimeKey(delivery.id, delivery.timing!);
  if (checkedDeliveries.has(key)) {
    return null; // Already checked, don't schedule again
  }

  // Mark as being checked to prevent duplicates
  checkedDeliveries.add(key);

  const timeoutId = setTimeout(async () => {
    const { inGeofence, breach } = await checkGeofence(delivery, userId);
    
    if (!inGeofence && breach) {
      onBreachDetected(breach);
    }
  }, timeUntilCheck);

  return () => {
    clearTimeout(timeoutId);
    // If canceled, remove from checked set so it can be rescheduled if needed
    // This allows timing updates to reset eligibility
    checkedDeliveries.delete(key);
  };
}