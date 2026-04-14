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
                    // Listen to all relevant log types
                },
                (payload) => {
                    const log = payload.new;
                    const meta = log.metadata || {};

                    if (log.type === 'GEOFENCE_BREACH') {
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

                    if (log.type === 'GPS_SPOOF_DETECTED') {
                        const photographer = meta.photographer_name || 'A photographer';
                        const title = `🚨 Spoof Alert: ${photographer}`;
                        const body = `Potential Fake GPS detected! Accuracy: ${meta.accuracy}m.`;

                        toast.error(title, { description: body, duration: 15000 });
                        sendPushNotification(title, {
                            body,
                            icon: '/favicon.ico',
                            tag: `admin_spoof_${log.id}`,
                            requireInteraction: true
                        });
                    }

                    if (log.type === 'GPS_STATUS_CHANGE' || log.type === 'NOTIFICATION_STATUS_CHANGE') {
                        const photographer = meta.photographer_name || 'A photographer';
                        const action = meta.status || meta.action || 'changed settings';
                        const typeLabel = log.type === 'GPS_STATUS_CHANGE' ? 'GPS' : 'Notifications';

                        toast.info(`${typeLabel} Update`, {
                            description: `${photographer} turned ${typeLabel} ${action}`,
                            duration: 8000,
                        });

                        sendPushNotification(`${typeLabel} Status Changed`, {
                            body: `${photographer} has turned ${typeLabel} ${action}.`,
                            icon: '/favicon.ico',
                            tag: `admin_status_${log.id}`,
                        });
                    }

                    if (log.type === 'MONITORING_NAG_SENT') {
                        const photographer = meta.photographer_name || 'A photographer';
                        const minutes = meta.minutesPassed || 0;
                        const title = `🚨 Nag Alert: ${photographer}`;
                        const body = `${photographer} still has permissions disabled (${minutes}m elapsed).`;

                        toast.warning(title, { description: body, duration: 10000 });
                        sendPushNotification(title, {
                            body,
                            icon: '/favicon.ico',
                            tag: `admin_nag_${log.actor_user_id}`,
                            requireInteraction: true
                        });
                    }
                }
            )
            .subscribe();

        // 3. V1 HARDENING: Background Polling for "Offline" Photographers
        // If a photographer has a delivery soon but hasn't sent a heartbeat, it's a "Silent Breach"
        const checkOfflineUsers = async () => {
            try {
                const { getUsers } = await import('../../lib/db/users');
                const { getDeliveriesByDate } = await import('../../lib/db/deliveries');
                const { getLocalDateString } = await import('../../lib/utils');

                const today = getLocalDateString();
                const [allUsers, allDeliveries] = await Promise.all([
                    getUsers(),
                    getDeliveriesByDate(today)
                ]);

                const now = new Date();
                const photographers = allUsers.filter(u => u.role === 'PHOTOGRAPHER' && u.active);

                photographers.forEach(p => {
                    const lastActive = p.last_active ? new Date(p.last_active) : null;
                    const minsSinceActive = lastActive ? (now.getTime() - lastActive.getTime()) / 60000 : Infinity;

                    // If offline for > 10 minutes
                    if (minsSinceActive > 10) {
                        // Check if they have an active/upcoming delivery within the 15-min check window
                        const myDeliveries = allDeliveries.filter(d => 
                            d.assigned_user_id === p.id && 
                            d.status === 'ASSIGNED' && 
                            d.timing
                        );

                        myDeliveries.forEach(d => {
                            const [hours, minutes] = d.timing!.split(':').map(Number);
                            const deliveryTime = new Date(now);
                            deliveryTime.setHours(hours, minutes, 0, 0);

                            const minsToDelivery = (deliveryTime.getTime() - now.getTime()) / 60000;

                            // If they are within 15 mins of delivery OR it's already delivery time, and they are OFFLINE
                            if (minsToDelivery <= 15 && minsToDelivery >= -30) {
                                const title = `⚠️ Offline Alert: ${p.name}`;
                                const body = `${p.name} has been offline for ${Math.round(minsSinceActive)}m during their ${d.timing} delivery!`;
                                
                                toast.error(title, { description: body, duration: 20000 });
                                sendPushNotification(title, {
                                    body,
                                    icon: '/favicon.ico',
                                    tag: `admin_offline_${p.id}`,
                                    requireInteraction: true
                                });
                            }
                        });
                    }
                });
            } catch (err) {
                console.error('Offline check loop failed:', err);
            }
        };

        const offlineInterval = setInterval(checkOfflineUsers, 5 * 60 * 1000); // Check every 5 mins
        checkOfflineUsers(); // Initial check

        return () => {
            console.log('🛑 AdminNotifier: Stopping listener and offline loop.');
            subscription.unsubscribe();
            clearInterval(offlineInterval);
        };
    }, [user]);

    return null; // Headless component
}
