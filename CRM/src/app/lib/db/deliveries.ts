import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Delivery, DeliveryStatus, DecisionState } from '../../types';
import type { Database } from '../types/database.types';

type DeliveryRow = Database['public']['Tables']['deliveries']['Row'];
type DeliveryInsert = Database['public']['Tables']['deliveries']['Insert'];
type DeliveryUpdate = Database['public']['Tables']['deliveries']['Update'];

// Type-safe mapping for status to satisfy DB constraints
const mapStatusToDb = (status: DeliveryStatus, currentReason?: string | null): { status: any; reason?: string | null } => {
  // DB enum: 'ASSIGNED' | 'UNASSIGNED' | 'REJECTED' | 'POSTPONED_CANCELED' | 'DONE'
  if (status === 'REJECTED_CUSTOMER') {
    return { status: 'REJECTED', reason: 'CUSTOMER_REJECTED' };
  }
  if (status === 'CANCELED') {
    return { status: 'POSTPONED_CANCELED', reason: currentReason };
  }
  return { status, reason: currentReason };
};

// Convert database row to app type
const rowToDelivery = (row: DeliveryRow): Delivery => {
  let status = row.status as DeliveryStatus;

  // V1 SPEC: "Promotion" logic for customer rejections
  // If status is REJECTED in DB but reason is CUSTOMER_REJECTED, promote it back to app-level REJECTED_CUSTOMER
  if (status === 'REJECTED' && row.unassignment_reason === 'CUSTOMER_REJECTED') {
    status = 'REJECTED_CUSTOMER';
  }

  return {
    id: row.id,
    date: row.date,
    showroom_code: row.showroom_code,
    cluster_code: row.cluster_code,
    showroom_type: row.showroom_type,
    timing: row.timing,
    delivery_name: row.delivery_name,
    status,
    assigned_user_id: row.assigned_user_id,
    payment_type: row.payment_type,
    footage_link: row.footage_link,
    reel_link: (row as any).reel_link ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    decisionState: row.decision_state as DecisionState | undefined,
    rejected_by_all: row.rejected_by_all ?? undefined,
    rejected_by_all_timestamp: row.rejected_by_all_timestamp ?? undefined,
    unassignment_reason: row.unassignment_reason ?? undefined,
    unassignment_timestamp: row.unassignment_timestamp ?? undefined,
    unassignment_by: row.unassignment_by ?? undefined,
    creation_index: row.creation_index ?? undefined,
    received_amount: row.received_amount ?? undefined,
    customer_phone: row.customer_phone ?? undefined,
    rapido_charge: row.rapido_charge ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
  };
};

// Get deliveries for a specific date
export const getDeliveriesByDate = async (date: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery[]> => {
  const { data, error } = await (supabaseClient.from('deliveries') as any)
    .select('*')
    .eq('date', date)
    .is('deleted_at', null)
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
  const { status: dbStatus, reason: dbReason } = mapStatusToDb(delivery.status, delivery.unassignment_reason);

  const insert: DeliveryInsert = {
    date: delivery.date,
    showroom_code: delivery.showroom_code,
    cluster_code: delivery.cluster_code,
    showroom_type: delivery.showroom_type,
    timing: delivery.timing,
    delivery_name: delivery.delivery_name,
    status: dbStatus,
    assigned_user_id: delivery.assigned_user_id,
    payment_type: delivery.payment_type,
    footage_link: delivery.footage_link,
    // @ts-ignore - DB types might lag
    reel_link: delivery.reel_link,
    decision_state: delivery.decisionState,
    rejected_by_all: delivery.rejected_by_all,
    rejected_by_all_timestamp: delivery.rejected_by_all_timestamp,
    unassignment_reason: dbReason,
    unassignment_timestamp: delivery.unassignment_timestamp,
    unassignment_by: delivery.unassignment_by,
    creation_index: delivery.creation_index,
    received_amount: delivery.received_amount,
    customer_phone: delivery.customer_phone,
    rapido_charge: delivery.rapido_charge,
    deleted_at: delivery.deleted_at,
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
  const { status: dbStatus, reason: dbReason } = updates.status
    ? mapStatusToDb(updates.status, updates.unassignment_reason)
    : { status: undefined, reason: updates.unassignment_reason };

  const update: any = {
    date: updates.date,
    showroom_code: updates.showroom_code,
    cluster_code: updates.cluster_code,
    showroom_type: updates.showroom_type,
    timing: updates.timing,
    delivery_name: updates.delivery_name,
    status: dbStatus,
    assigned_user_id: updates.assigned_user_id,
    payment_type: updates.payment_type,
    footage_link: updates.footage_link,
    reel_link: updates.reel_link,
    decision_state: updates.decisionState,
    rejected_by_all: updates.rejected_by_all,
    rejected_by_all_timestamp: updates.rejected_by_all_timestamp,
    unassignment_reason: dbReason,
    unassignment_timestamp: updates.unassignment_timestamp,
    unassignment_by: updates.unassignment_by,
    creation_index: updates.creation_index,
    received_amount: updates.received_amount,
    customer_phone: updates.customer_phone,
    rapido_charge: updates.rapido_charge,
    deleted_at: updates.deleted_at,
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
  
  // V19 FIX: Keep reel_tasks in sync if reel_link is updated from CRM or Google Sync
  if ('reel_link' in update) {
    const isResolved = !!update.reel_link && update.reel_link.trim() !== '';
    const taskUpdate: any = {
      reel_link: update.reel_link || null,
      status: isResolved ? 'RESOLVED' : 'PENDING'
    };
    if (isResolved) {
      taskUpdate.is_post_it = false;
    }
    await (supabaseClient.from('reel_tasks') as any)
      .update(taskUpdate)
      .eq('delivery_id', id);
  }

  return rowToDelivery(data as DeliveryRow);
};

// Soft Delete a delivery (Stage 1 of Safe Delete)
export const softDeleteDelivery = async (id: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
  const { error } = await (supabaseClient.from('deliveries') as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// Permanent Delete a delivery (Stage 2 of Safe Delete)
export const deleteDelivery = async (id: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
  const { error } = await (supabaseClient.from('deliveries') as any)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Delete all deliveries (Admin only)
export const deleteAllDeliveries = async (supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
  const { error } = await (supabaseClient.from('deliveries') as any)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes all rows

  if (error) throw error;
};

// Delete deliveries for a specific showroom code
export const deleteDeliveriesByShowroomCode = async (showroomCode: string, supabaseClient: SupabaseClient<Database> = supabase): Promise<void> => {
  const { error } = await (supabaseClient.from('deliveries') as any)
    .delete()
    .eq('showroom_code', showroomCode);

  if (error) throw error;
};

// Get deliveries with filters
export const getDeliveries = async (filters?: {
  date?: string;
  status?: DeliveryStatus;
  assignedUserId?: string;
  clusterCode?: string;
  showroomCode?: string;
  showroomCodes?: string[];
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}, supabaseClient: SupabaseClient<Database> = supabase): Promise<Delivery[]> => {
  let query = (supabaseClient.from('deliveries') as any).select('*');

  if (!filters?.includeDeleted) {
    query = query.is('deleted_at', null);
  }

  if (filters?.date) {
    query = query.eq('date', filters.date);
  }
  if (filters?.status) {
    const { status: dbStatus } = mapStatusToDb(filters.status);
    query = query.eq('status', dbStatus);
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
  if (filters?.showroomCodes && filters.showroomCodes.length > 0) {
    query = (query as any).in('showroom_code', filters.showroomCodes);
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

// Check for duplicate footage links within a dealership
export const checkDuplicateFootageLink = async (
  link: string, 
  showroomCode: string, 
  excludeId?: string,
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<Delivery | null> => {
  if (!link || link.toLowerCase() === 'only photos') return null;

  let query = (supabaseClient.from('deliveries') as any)
    .select('*')
    .eq('footage_link', link)
    .eq('showroom_code', showroomCode)
    .is('deleted_at', null);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  if (data && data.length > 0) {
    return rowToDelivery(data[0] as DeliveryRow);
  }
  
  return null;
};
