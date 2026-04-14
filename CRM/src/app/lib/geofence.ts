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
 * Check the current geolocation permission status
 */
export async function checkGeolocationPermission(): Promise<PermissionState> {
  if (!navigator.permissions || !navigator.permissions.query) {
    return 'prompt'; // Fallback for browsers that don't support permissions API
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state;
  } catch (error) {
    console.error('Permission query failed:', error);
    return 'prompt';
  }
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

    // V1 HARDENING: Spoof Detection (Fake GPS)
    // Most spoofing apps provide a static accuracy of 0 or a perfect 1.0m.
    // Some browsers also provide a 'mocked' flag.
    const isMocked = (position as any).mocked === true;
    const isSuspiciousAccuracy = position.coords.accuracy === 0 || position.coords.accuracy === 1;
    
    if (isMocked || isSuspiciousAccuracy) {
      const { createLogEvent } = await import('./db/logs');
      await createLogEvent({
        type: 'GPS_SPOOF_DETECTED',
        actor_user_id: userId,
        target_id: delivery.id,
        metadata: {
          latitude: userLat,
          longitude: userLng,
          accuracy: position.coords.accuracy,
          is_mocked: isMocked,
          delivery_name: delivery.delivery_name,
          showroom_code: delivery.showroom_code
        }
      });

      console.warn('🚨 [Geofence] Potential GPS Spoofing detected!', { accuracy: position.coords.accuracy });
      
      // Treat spoofing as a breach
      const breach: GeofenceBreach = {
        id: `gb_spoof_${Date.now()}`,
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

  // V1 FIX: If we are within the 15-minute window before delivery, return 0 for immediate check
  if (now.getTime() >= checkTime.getTime() && now.getTime() < deliveryDateTime.getTime()) {
    return 0;
  }

  // Return null if delivery has already started or it's too early
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
      // V1 FIX: Respect the 5-notification limit per delivery
      const countKey = `breach_count_${delivery.id}`;
      const count = parseInt(localStorage.getItem(countKey) || '0');
      
      if (count < 5) {
        localStorage.setItem(countKey, (count + 1).toString());
        onBreachDetected(breach);
      } else {
        console.log(`📍 [Geofence] Limit reached (5/5) for delivery ${delivery.id}. Silencing further alerts.`);
      }
    }
  }, timeUntilCheck);

  return () => {
    clearTimeout(timeoutId);
    checkedDeliveries.delete(key);
  };
}