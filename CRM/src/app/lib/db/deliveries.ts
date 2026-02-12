import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Delivery, DeliveryStatus, DecisionState } from '../../types';
import type { Database } from '../types/database.types';

type DeliveryRow = Database['public']['Tables']['deliveries']['Row'];
type DeliveryInsert = Database['public']['Tables']['deliveries']['Insert'];
type DeliveryUpdate = Database['public']['Tables']['deliveries']['Update'];

// Type-safe mapping for status to satisfy DB constraints
const mapStatusToDb = (status: DeliveryStatus): any => {
  // DB enum: 'ASSIGNED' | 'UNASSIGNED' | 'REJECTED' | 'POSTPONED_CANCELED' | 'DONE'
  if (status === 'REJECTED_CUSTOMER') return 'REJECTED';
  if (status === 'CANCELED') return 'POSTPONED_CANCELED';
  return status;
};

// Convert database row to app type
const rowToDelivery = (row: DeliveryRow): Delivery => ({
  id: row.id,
  date: row.date,
  showroom_code: row.showroom_code,
  cluster_code: row.cluster_code,
  showroom_type: row.showroom_type,
  timing: row.timing,
  delivery_name: row.delivery_name,
  status: row.status as DeliveryStatus,
  assigned_user_id: row.assigned_user_id,
  payment_type: row.payment_type,
  footage_link: row.footage_link,
  reel_link: (row as any).reel_link ?? null, // Cast because DB types might lag behind manual schema change
  created_at: row.created_at,
  updated_at: row.updated_at,
  decisionState: row.decision_state as DecisionState | undefined,
  rejected_by_all: row.rejected_by_all ?? undefined,
  rejected_by_all_timestamp: row.rejected_by_all_timestamp ?? undefined,
  unassignment_reason: row.unassignment_reason ?? undefined,
  unassignment_timestamp: row.unassignment_timestamp ?? undefined,
  unassignment_by: row.unassignment_by ?? undefined,
  creation_index: row.creation_index ?? undefined,
});

// Get deliveries for a specific date
export const getDeliveriesByDate = async (date: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery[]> => {
  const { data, error } = await (supabaseClient.from('deliveries') as any)
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data as DeliveryRow[]).map(rowToDelivery);
};

// Get unassigned deliveries for a cluster
export const getUnassignedDeliveries = async (clusterCode: string, date?: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery[]> => {
  let query = (supabaseClient.from('deliveries') as any)
    .select('*')
    .eq('status', 'UNASSIGNED')
    .eq('cluster_code', clusterCode);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;
  return (data as DeliveryRow[]).map(rowToDelivery);
};

// Create a new delivery
export const createDelivery = async (
  delivery: Omit<Delivery, 'id' | 'created_at' | 'updated_at'>,
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<Delivery> => {
  const insert: DeliveryInsert = {
    date: delivery.date,
    showroom_code: delivery.showroom_code,
    cluster_code: delivery.cluster_code,
    showroom_type: delivery.showroom_type,
    timing: delivery.timing,
    delivery_name: delivery.delivery_name,
    status: mapStatusToDb(delivery.status),
    assigned_user_id: delivery.assigned_user_id,
    payment_type: delivery.payment_type,
    footage_link: delivery.footage_link,
    // @ts-ignore - DB types might lag
    reel_link: delivery.reel_link,
    decision_state: delivery.decisionState,
    rejected_by_all: delivery.rejected_by_all,
    rejected_by_all_timestamp: delivery.rejected_by_all_timestamp,
    unassignment_reason: delivery.unassignment_reason,
    unassignment_timestamp: delivery.unassignment_timestamp,
    unassignment_by: delivery.unassignment_by,
    creation_index: delivery.creation_index,
  };

  const { data, error } = await (supabaseClient.from('deliveries') as any)
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToDelivery(data as DeliveryRow);
};

// Update a delivery
export const updateDelivery = async (id: string, updates: Partial<Delivery>, supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery> => {
  const update: any = {
    date: updates.date,
    showroom_code: updates.showroom_code,
    cluster_code: updates.cluster_code,
    showroom_type: updates.showroom_type,
    timing: updates.timing,
    delivery_name: updates.delivery_name,
    status: updates.status ? mapStatusToDb(updates.status) : undefined,
    assigned_user_id: updates.assigned_user_id,
    payment_type: updates.payment_type,
    footage_link: updates.footage_link,
    reel_link: updates.reel_link,
    decision_state: updates.decisionState,
    rejected_by_all: updates.rejected_by_all,
    rejected_by_all_timestamp: updates.rejected_by_all_timestamp,
    unassignment_reason: updates.unassignment_reason,
    unassignment_timestamp: updates.unassignment_timestamp,
    unassignment_by: updates.unassignment_by,
    creation_index: updates.creation_index,
  };

  // Remove undefined values
  Object.keys(update).forEach(key => {
    if (update[key] === undefined) {
      delete update[key];
    }
  });

  const { data, error } = await (supabaseClient.from('deliveries') as any)
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToDelivery(data as DeliveryRow);
};

// Delete a delivery (soft delete by updating status)
export const deleteDelivery = async (id: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
  const { error } = await (supabaseClient.from('deliveries') as any)
    .update({ status: 'POSTPONED_CANCELED' })
    .eq('id', id);

  if (error) throw error;
};

// Get deliveries with filters
export const getDeliveries = async (filters?: {
  date?: string;
  status?: DeliveryStatus;
  assignedUserId?: string;
  clusterCode?: string;
  showroomCode?: string;
  limit?: number;
  offset?: number;
}, supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery[]> => {
  let query = (supabaseClient.from('deliveries') as any).select('*');

  if (filters?.date) {
    query = query.eq('date', filters.date);
  }
  if (filters?.status) {
    query = query.eq('status', mapStatusToDb(filters.status));
  }
  if (filters?.assignedUserId) {
    query = query.eq('assigned_user_id', filters.assignedUserId);
  }
  if (filters?.clusterCode) {
    query = query.eq('cluster_code', filters.clusterCode);
  }
  if (filters?.showroomCode) {
    query = query.eq('showroom_code', filters.showroomCode);
  }

  // V4.7 FIX: Default limit to 5000 (Supabase defaults to 1000) to prevent data loss
  const limit = filters?.limit || 5000;
  query = query.limit(limit);

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + limit - 1);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return (data as DeliveryRow[]).map(rowToDelivery);
};

// Get a single delivery by ID
export const getDeliveryById = async (id: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery | null> => {
  const { data, error } = await (supabaseClient.from('deliveries') as any)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return rowToDelivery(data as DeliveryRow);
};

// Get multiple deliveries by IDs
export const getDeliveriesByIds = async (ids: string[], supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery[]> => {
  if (ids.length === 0) return [];

  const { data, error } = await (supabaseClient.from('deliveries') as any)
    .select('*')
    .in('id', ids)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DeliveryRow[]).map(rowToDelivery);
};
