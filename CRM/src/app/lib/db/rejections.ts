import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { DeliveryRejection } from '../../types';
import type { Database } from '../types/database.types';

type RejectionRow = Database['public']['Tables']['delivery_rejections']['Row'];
type RejectionInsert = Database['public']['Tables']['delivery_rejections']['Insert'];

const rowToRejection = (row: RejectionRow): DeliveryRejection => ({
    id: row.id,
    delivery_id: row.delivery_id,
    user_id: row.user_id,
    rejected_at: row.rejected_at,
});

export const createRejection = async (
    deliveryId: string,
    userId: string,
    supabaseClient: SupabaseClient<Database> = supabase
): Promise<DeliveryRejection> => {
    const insert: RejectionInsert = {
        delivery_id: deliveryId,
        user_id: userId,
    };

    const { data, error } = await (supabaseClient.from('delivery_rejections') as any)
        .insert(insert)
        .select()
        .single();

    if (error) throw error;
    return rowToRejection(data as RejectionRow);
};

export const hasUserRejected = async (
    deliveryId: string,
    userId: string,
    supabaseClient: SupabaseClient<Database> = supabase
): Promise<boolean> => {
    const { count, error } = await (supabaseClient.from('delivery_rejections') as any)
        .select('*', { count: 'exact', head: true })
        .eq('delivery_id', deliveryId)
        .eq('user_id', userId);

    if (error) throw error;
    return (count || 0) > 0;
};

// Batch check for efficiency: Get all rejections for a user today (or recent)
export const getUserRejections = async (
    userId: string,
    supabaseClient: SupabaseClient<Database> = supabase
): Promise<string[]> => {
    const { data, error } = await (supabaseClient.from('delivery_rejections') as any)
        .select('delivery_id')
        .eq('user_id', userId);

    if (error) throw error;
    return (data as { delivery_id: string }[]).map(r => r.delivery_id);
};

// Get distinct user IDs who have rejected a specific delivery
export const getDistinctRejections = async (
    deliveryId: string,
    supabaseClient: SupabaseClient<Database> = supabase
): Promise<string[]> => {
    const { data, error } = await (supabaseClient.from('delivery_rejections') as any)
        .select('user_id')
        .eq('delivery_id', deliveryId);

    if (error) throw error;

    // Deduplicate user IDs just in case
    const userIds = (data as { user_id: string }[]).map(r => r.user_id);
    return Array.from(new Set(userIds));
};
