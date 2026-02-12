import type { Delivery, GeofenceBreach } from '../types';

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
  userId: string,
  targetLat: number,
  targetLng: number
): Promise<{ inGeofence: boolean; breach: GeofenceBreach | null }> {
  try {
    const position = await getCurrentPosition();
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    console.log(`📍 [Geofence] Checking distance for delivery ${delivery.delivery_name}`, {
      user: { lat: userLat, lng: userLng },
      target: { lat: targetLat, lng: targetLng }
    });

    const distance = calculateDistance(
      userLat,
      userLng,
      targetLat,
      targetLng
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
 * Returns cleanup function to cancel the scheduled check
 */
export function scheduleGeofenceCheck(
  delivery: Delivery,
  userId: string,
  targetLat: number,
  targetLng: number,
  onBreachDetected: (breach: GeofenceBreach) => void
): (() => void) | null {
  const timeUntilCheck = getTimeUntilGeofenceCheck(delivery);

  if (timeUntilCheck === null) {
    return null;
  }

  // V1 SPEC: Only check each delivery-time pair once
  const key = getDeliveryTimeKey(delivery.id, delivery.timing!);
  if (checkedDeliveries.has(key)) {
    return null; // Already checked
  }

  // Mark as being checked to prevent duplicates
  checkedDeliveries.add(key);

  const timeoutId = setTimeout(async () => {
    const { inGeofence, breach } = await checkGeofence(delivery, userId, targetLat, targetLng);

    if (!inGeofence && breach) {
      onBreachDetected(breach);
    }
  }, timeUntilCheck);

  return () => {
    clearTimeout(timeoutId);
    checkedDeliveries.delete(key);
  };
}