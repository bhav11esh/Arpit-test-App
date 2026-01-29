import { supabase } from '../supabase';
import type { Delivery, DeliveryStatus, DecisionState } from '../../types';
import type { Database } from '../types/database.types';

type DeliveryRow = Database['public']['Tables']['deliveries']['Row'];
type DeliveryInsert = Database['public']['Tables']['deliveries']['Insert'];
type DeliveryUpdate = Database['public']['Tables']['deliveries']['Update'];

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
export const getDeliveriesByDate = async (date: string): Promise<Delivery[]> => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToDelivery);
};

// Get deliveries for a user
export const getDeliveriesByUser = async (userId: string, date?: string): Promise<Delivery[]> => {
  let query = supabase
    .from('deliveries')
    .select('*')
    .eq('assigned_user_id', userId);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToDelivery);
};

// Get unassigned deliveries for a cluster
export const getUnassignedDeliveries = async (clusterCode: string, date?: string): Promise<Delivery[]> => {
  let query = supabase
    .from('deliveries')
    .select('*')
    .eq('status', 'UNASSIGNED')
    .eq('cluster_code', clusterCode);

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToDelivery);
};

// Get a single delivery by ID
export const getDeliveryById = async (id: string): Promise<Delivery | null> => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return rowToDelivery(data);
};

// Create a new delivery
export const createDelivery = async (delivery: Omit<Delivery, 'id' | 'created_at' | 'updated_at'>): Promise<Delivery> => {
  const insert: DeliveryInsert = {
    date: delivery.date,
    showroom_code: delivery.showroom_code,
    cluster_code: delivery.cluster_code,
    showroom_type: delivery.showroom_type,
    timing: delivery.timing,
    delivery_name: delivery.delivery_name,
    status: delivery.status,
    assigned_user_id: delivery.assigned_user_id,
    payment_type: delivery.payment_type,
    footage_link: delivery.footage_link,
    decision_state: delivery.decisionState,
    rejected_by_all: delivery.rejected_by_all,
    rejected_by_all_timestamp: delivery.rejected_by_all_timestamp,
    unassignment_reason: delivery.unassignment_reason,
    unassignment_timestamp: delivery.unassignment_timestamp,
    unassignment_by: delivery.unassignment_by,
    creation_index: delivery.creation_index,
  };

  const { data, error } = await supabase
    .from('deliveries')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToDelivery(data);
};

// Update a delivery
export const updateDelivery = async (id: string, updates: Partial<Delivery>): Promise<Delivery> => {
  const update: DeliveryUpdate = {
    date: updates.date,
    showroom_code: updates.showroom_code,
    cluster_code: updates.cluster_code,
    showroom_type: updates.showroom_type,
    timing: updates.timing,
    delivery_name: updates.delivery_name,
    status: updates.status,
    assigned_user_id: updates.assigned_user_id,
    payment_type: updates.payment_type,
    footage_link: updates.footage_link,
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
    if (update[key as keyof DeliveryUpdate] === undefined) {
      delete update[key as keyof DeliveryUpdate];
    }
  });

  const { data, error } = await supabase
    .from('deliveries')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToDelivery(data);
};

// Delete a delivery (soft delete by updating status)
export const deleteDelivery = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('deliveries')
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
  limit?: number;
  offset?: number;
}): Promise<Delivery[]> => {
  let query = supabase.from('deliveries').select('*');

  if (filters?.date) {
    query = query.eq('date', filters.date);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assignedUserId) {
    query = query.eq('assigned_user_id', filters.assignedUserId);
  }
  if (filters?.clusterCode) {
    query = query.eq('cluster_code', filters.clusterCode);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }
  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) throw error;
  return data.map(rowToDelivery);
};
