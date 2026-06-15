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
  deadline: row.deadline ?? undefined,
  // V19: Post-it marketplace fields
  is_post_it: (row as any).is_post_it ?? false,
  original_user_id: (row as any).original_user_id ?? undefined,
  claim_deadline: (row as any).claim_deadline ?? undefined,
  failed_claimants: (row as any).failed_claimants ?? [],
  post_it_reward: (row as any).post_it_reward ?? undefined,
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
    deadline: reelTask.deadline ?? null,
  };

  const { data, error } = await (supabaseClient.from('reel_tasks') as any)
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
    deadline: updates.deadline ?? null,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof ReelTaskUpdate] === undefined) {
      delete update[key as keyof ReelTaskUpdate];
    }
  });

  const { data, error } = await (supabaseClient.from('reel_tasks') as any)
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

// Delete reel tasks for multiple deliveries
export const deleteReelTasksByDeliveryIds = async (deliveryIds: string[]): Promise<void> => {
  if (deliveryIds.length === 0) return;
  
  // V5.2 FIX: Chunk deletions to avoid URL length limits in Supabase/PostgREST
  const chunkSize = 50;
  for (let i = 0; i < deliveryIds.length; i += chunkSize) {
    const chunk = deliveryIds.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('reel_tasks')
      .delete()
      .in('delivery_id', chunk);

    if (error) throw error;
  }
};

// Delete all reel tasks (Admin only)
export const deleteAllReelTasks = async (): Promise<void> => {
  const { error } = await supabase
    .from('reel_tasks')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) throw error;
};

// Get all available post-it reels for the marketplace
export const getPostItReels = async (supabaseClient: SupabaseClient<Database> = supabase): Promise<(ReelTask & { delivery?: any })[]> => {
  const { data, error } = await supabaseClient
    .from('reel_tasks')
    .select('*, delivery:deliveries(*)')
    .eq('is_post_it', true)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(row => ({
    ...rowToReelTask(row),
    delivery: row.delivery
  }));
};

// Trigger the backend to refresh/auto-assign post-its
export const refreshPostIts = async (supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
  const { error } = await supabaseClient.rpc('refresh_post_its');
  if (error) throw error;
};

// Claim a post-it reel
export const claimPostIt = async (taskId: string, userId: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
  const { error } = await supabaseClient.rpc('claim_post_it', {
    p_task_id: taskId,
    p_user_id: userId
  });
  if (error) throw error;
};
