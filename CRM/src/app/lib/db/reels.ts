import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { ReelTask, ReelStatus } from '../../types';
import type { Database } from '../types/database.types';

type ReelTaskRow = Database['public']['Tables']['reel_tasks']['Row'];
type ReelTaskInsert = Database['public']['Tables']['reel_tasks']['Insert'];
type ReelTaskUpdate = Database['public']['Tables']['reel_tasks']['Update'];

// Convert database row to app type
const rowToReelTask = (row: ReelTaskRow): ReelTask => ({
  id: row.id,
  delivery_id: row.delivery_id,
  assigned_user_id: row.assigned_user_id,
  reel_link: row.reel_link ?? undefined,
  status: row.status as ReelStatus,
  reassigned_reason: row.reassigned_reason ?? undefined,
});

// Get reel tasks for a user
export const getReelTasksByUser = async (userId: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<ReelTask[]> => {
  const { data, error } = await supabaseClient
    .from('reel_tasks')
    .select('*')
    .eq('assigned_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(rowToReelTask);
};

// Get pending reel tasks for a user
export const getPendingReelTasksByUser = async (userId: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<ReelTask[]> => {
  const { data, error } = await supabaseClient
    .from('reel_tasks')
    .select('*')
    .eq('assigned_user_id', userId)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToReelTask);
};

// Get all reel tasks (admin only)
export const getAllReelTasks = async (status?: ReelStatus, supabaseClient: SupabaseClient<Database> = supabase): Promise<ReelTask[]> => {
  let query = supabaseClient.from('reel_tasks').select('*');

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(rowToReelTask);
};

// Get a single reel task by ID
export const getReelTaskById = async (id: string): Promise<ReelTask | null> => {
  const { data, error } = await supabase
    .from('reel_tasks')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToReelTask(data);
};

// Get reel task by delivery ID
export const getReelTaskByDelivery = async (deliveryId: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<ReelTask | null> => {
  const { data, error } = await supabaseClient
    .from('reel_tasks')
    .select('*')
    .eq('delivery_id', deliveryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToReelTask(data);
};

// Create a new reel task
export const createReelTask = async (reelTask: Omit<ReelTask, 'id'>, supabaseClient: SupabaseClient<Database> = supabase): Promise<ReelTask> => {
  const insert: ReelTaskInsert = {
    delivery_id: reelTask.delivery_id,
    assigned_user_id: reelTask.assigned_user_id,
    reel_link: reelTask.reel_link ?? null,
    status: reelTask.status,
    reassigned_reason: reelTask.reassigned_reason ?? null,
  };

  const { data, error } = await supabaseClient
    .from('reel_tasks')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToReelTask(data);
};

// Update a reel task
export const updateReelTask = async (id: string, updates: Partial<ReelTask>, supabaseClient: SupabaseClient<Database> = supabase): Promise<ReelTask> => {
  const update: ReelTaskUpdate = {
    delivery_id: updates.delivery_id,
    assigned_user_id: updates.assigned_user_id,
    reel_link: updates.reel_link ?? null,
    status: updates.status,
    reassigned_reason: updates.reassigned_reason ?? null,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof ReelTaskUpdate] === undefined) {
      delete update[key as keyof ReelTaskUpdate];
    }
  });

  const { data, error } = await supabaseClient
    .from('reel_tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToReelTask(data);
};

// Delete a reel task
export const deleteReelTask = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('reel_tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
