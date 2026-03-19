/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Geofencing background check
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const payload = event.data.json();

    // V1 SPEC: Only process background geofence checks
    if (payload.type === 'GEOFENCE_CHECK') {
        event.waitUntil(handleGeofenceCheck(payload));
    }
});

async function handleGeofenceCheck(payload: any) {
    const { deliveryId, targetLat, targetLng, deliveryName, timing, photographerName, showroomCode } = payload;

    try {
        // 1. Get current location in background
        // Note: This requires "Always Allow" GPS permission on Android/iOS
        const position = await getCurrentPositionBackground();
        const { latitude, longitude } = position.coords;

        // 2. Calculate distance (Haversine formula)
        const distance = calculateDistance(latitude, longitude, targetLat, targetLng);

        // 3. V1 RULE: If > 500m away, it's a breach
        if (distance > 500) {
            const distanceKm = distance >= 1000
                ? `${(distance / 1000).toFixed(1)}km`
                : `${Math.round(distance)}m`;

            // 4. Show Notification to Photographer
            await self.registration.showNotification('Location Alert! 📍', {
                body: `You are ${distanceKm} away from ${showroomCode}. Please ensure you reach for your ${timing} delivery.`,
                icon: '/favicon.ico',
                tag: `breach_${deliveryId}`,
                data: { deliveryId }
            });

            // 5. Log Breach to Supabase (via a simple fetch since we are in SW)
            // We pass the URL and key in the push payload for convenience or use hardcoded/env if possible
            // Better: Fetch them from the client during registration and store in IndexedDB or similar?
            // For now, let's assume the payload contains the necessary info or we use a dedicated log endpoint.
            await logBreachToSupabase(payload, { latitude, longitude, distance });
        }
    } catch (error) {
        console.error('Background Geofence Error:', error);
    }
}

function getCurrentPositionBackground(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

async function logBreachToSupabase(payload: any, result: { latitude: number, longitude: number, distance: number }) {
    const { supabaseUrl, supabaseKey, deliveryId, userId, deliveryName, timing, photographerName, showroomCode } = payload;

    if (!supabaseUrl || !supabaseKey) return;

    const body = {
        type: 'GEOFENCE_BREACH',
        actor_user_id: userId,
        target_id: deliveryId,
        metadata: {
            latitude: result.latitude,
            longitude: result.longitude,
            distance_from_target: result.distance,
            breach_time: new Date().toISOString(),
            target_lat: payload.targetLat,
            target_lng: payload.targetLng,
            delivery_name: deliveryName,
            delivery_time: timing,
            photographer_name: photographerName,
            showroom_code: showroomCode,
            source: 'background_sw'
        }
    };

    try {
        await fetch(`${supabaseUrl}/rest/v1/log_events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify(body)
        });
    } catch (err) {
        console.error('Failed to log background breach:', err);
    }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow('/')
    );
});
