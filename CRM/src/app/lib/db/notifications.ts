import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Database } from '../types/database.types';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    body: string;
    type: 'DAY_CLOSURE' | 'REEL_BACKLOG' | 'SYSTEM';
    read_at: string | null;
    created_at: string;
}

export const getNotifications = async (userId: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<Notification[]> => {
    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

export const createNotification = async (notification: Omit<Notification, 'id' | 'created_at' | 'read_at'>, supabaseClient: SupabaseClient<Database> = supabase): Promise<Notification> => {
    const { data, error } = await (supabaseClient
        .from('notifications') as any)
        .insert(notification)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const markAsRead = async (id: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
    const { error } = await (supabaseClient
        .from('notifications') as any)
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);

    if (error) throw error;
};

export const deleteNotification = async (id: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
    const { error } = await supabaseClient
        .from('notifications')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
