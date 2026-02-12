import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { LogEvent } from '../../types';
import type { Database } from '../types/database.types';

type LogEventRow = Database['public']['Tables']['log_events']['Row'];
type LogEventInsert = Database['public']['Tables']['log_events']['Insert'];

// Convert database row to app type
const rowToLogEvent = (row: LogEventRow): LogEvent => ({
  id: row.id,
  type: row.type,
  actor_user_id: row.actor_user_id,
  target_id: row.target_id,
  metadata: row.metadata as Record<string, any>,
  created_at: row.created_at,
});

// Get log events with filters
export const getLogEvents = async (filters?: {
  type?: string;
  actorUserId?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}, supabaseClient: SupabaseClient<Database> = supabase): Promise<LogEvent[]> => {
  let query = (supabaseClient.from('log_events') as any).select('*');

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.actorUserId) {
    query = query.eq('actor_user_id', filters.actorUserId);
  }
  if (filters?.targetId) {
    query = query.eq('target_id', filters.targetId);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
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
  return data.map(rowToLogEvent);
};

// Create a new log event
export const createLogEvent = async (event: Omit<LogEvent, 'id' | 'created_at'>, supabaseClient: SupabaseClient<Database> = supabase): Promise<LogEvent> => {
  const insert: LogEventInsert = {
    type: event.type,
    actor_user_id: event.actor_user_id,
    target_id: event.target_id,
    metadata: event.metadata,
  };

  const { data, error } = await (supabaseClient.from('log_events') as any)
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToLogEvent(data);
};

// Clear all log events (admin only)
export const clearAllLogEvents = async (): Promise<void> => {
  const { error } = await (supabase.from('log_events') as any)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) throw error;
};
