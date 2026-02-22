import React, { useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { requestNotificationPermission, sendPushNotification } from '../../lib/utils';
import { toast } from 'sonner';

/**
 * AdminNotifier - V1 SPEC: Headless component that listens for system-wide events
 * Specifically monitors GEOFENCE_BREACH logs to notify Admins in real-time.
 */
export function AdminNotifier() {
    const { user } = useAuth();

    useEffect(() => {
        // Only admins should receive these specialized system alerts
        if (user?.role !== 'ADMIN') return;

        // 1. Request permission on mount
        requestNotificationPermission();

        console.log('🚀 AdminNotifier: Starting real-time listener for Geofence Breaches...');

        // 2. Subscribe to new log events
        const subscription = supabase
            .channel('admin_geofence_alerts')
            .on(
                'postgres_changes' as any,
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'log_events',
                    filter: "type=eq.GEOFENCE_BREACH"
                },
                (payload) => {
                    const log = payload.new;
                    const meta = log.metadata || {};

                    // Extract details for the notification body
                    const photographer = meta.photographer_name || 'Unknown Photographer';
                    const delivery = meta.delivery_name || meta.showroom_code || 'Unknown Delivery';
                    const time = meta.delivery_time || 'N/A';
                    const distance = meta.distance_from_target >= 1000
                        ? `${(meta.distance_from_target / 1000).toFixed(1)}km`
                        : `${meta.distance_from_target}m`;
                    const location = `${meta.latitude.toFixed(6)}, ${meta.longitude.toFixed(6)}`;

                    // Trigger Toast for immediate UI visibility
                    toast.error(`Geofence Breach: ${photographer}`, {
                        description: `${delivery} at ${time} (${distance} away)`,
                        duration: 10000,
                    });

                    // Trigger Browser Push Notification for background/tab-out visibility
                    sendPushNotification('Geofence Breach Detected!', {
                        body: `${photographer} is ${distance} away for ${delivery} (${time}).\nLocation: ${location}`,
                        icon: '/favicon.ico',
                        tag: `admin_breach_${log.id}`,
                        requireInteraction: true // Keep it visible until dismissed
                    });
                }
            )
            .subscribe();

        return () => {
            console.log('🛑 AdminNotifier: Stopping listener.');
            subscription.unsubscribe();
        };
    }, [user]);

    return null; // Headless component
}
