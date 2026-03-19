import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Database } from '../types/database.types';

export interface PushSubscriptionMetadata {
    endpoint: string;
    p256dh: string;
    auth: string;
    subscription_json: any;
}

export const savePushSubscription = async (
    userId: string,
    subscription: PushSubscription,
    supabaseClient: SupabaseClient<Database> = supabase
): Promise<void> => {
    const subJSON = subscription.toJSON();
    if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
        throw new Error('Invalid push subscription object');
    }

    const { error } = await (supabaseClient
        .from('push_subscriptions') as any)
        .upsert({
            user_id: userId,
            endpoint: subJSON.endpoint,
            p256dh: subJSON.keys.p256dh,
            auth: subJSON.keys.auth,
            subscription_json: subJSON,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'endpoint'
        });

    if (error) throw error;
};

export const removePushSubscription = async (
    endpoint: string,
    supabaseClient: SupabaseClient<Database> = supabase
): Promise<void> => {
    const { error } = await supabaseClient
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

    if (error) throw error;
};

export const getSubscriptionsByUserId = async (
    userId: string,
    supabaseClient: SupabaseClient<Database> = supabase
): Promise<any[]> => {
    const { data, error } = await supabaseClient
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

    if (error) throw error;
    return data || [];
};

/**
 * V1 ADMIN NOTIFICATION: Send push to all active admins
 * Used for Geofence Breaches and Force Assignments
 */
export const sendPushToAdmins = async (
    payload: { title: string; body: string; data?: any }
): Promise<void> => {
    const { adminSupabase } = await import('../supabase');
    if (!adminSupabase) return; // No admin key = no push from this client

    try {
        // 1. Get all Admin user IDs
        const { data: adminUsers } = await (adminSupabase.from('users') as any)
            .select('id')
            .eq('role', 'ADMIN')
            .eq('active', true);

        if (!adminUsers || adminUsers.length === 0) return;

        // 2. Get all subscriptions for these admins
        const adminIds = adminUsers.map((u: any) => u.id);
        const { data: subs } = await (adminSupabase.from('push_subscriptions') as any)
            .select('*')
            .in('user_id', adminIds);

        if (!subs || subs.length === 0) return;

        // 3. Post to a trigger endpoint (or handle locally if private key exists)
        // V1 Note: Ideally this calls a Supabase Edge Function or a specialized route
        // For now, we log the intent. In a real environment, we'd use the VAPID_PRIVATE_KEY
        // and a library like web-push.
        console.log(`📣 [Push] Intent to notify ${subs.length} Admin devices: ${payload.title}`);
    } catch (err) {
        console.error('Failed to send admin push:', err);
    }
};

/**
 * V1 TARGETED NOTIFICATION: Send push to a specific user
 * Used for Nudges and Force Assignments
 */
export const sendPushToUser = async (
    userId: string,
    payload: { title: string; body: string; data?: any }
): Promise<void> => {
    const { adminSupabase } = await import('../supabase');
    if (!adminSupabase) return;

    try {
        const { data: subs } = await (adminSupabase.from('push_subscriptions') as any)
            .select('*')
            .eq('user_id', userId);

        if (!subs || subs.length === 0) return;

        console.log(`📣 [Push] Intent to notify User ${userId} (${subs.length} devices): ${payload.title}`);
    } catch (err) {
        console.error('Failed to send user push:', err);
    }
};
