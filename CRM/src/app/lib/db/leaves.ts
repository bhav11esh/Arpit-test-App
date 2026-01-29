import { supabase } from '../supabase';
import type { Leave, LeaveHalf, LeaveAppliedBy } from '../../types';
import type { Database } from '../types/database.types';

type LeaveRow = Database['public']['Tables']['leaves']['Row'];
type LeaveInsert = Database['public']['Tables']['leaves']['Insert'];
type LeaveUpdate = Database['public']['Tables']['leaves']['Update'];

// Convert database row to app type
const rowToLeave = (row: LeaveRow): Leave => ({
  id: row.id,
  photographerId: row.photographer_id,
  date: row.date,
  half: row.half as LeaveHalf,
  appliedBy: row.applied_by as LeaveAppliedBy,
  appliedAt: row.applied_at,
});

// Get leaves for a photographer
export const getLeavesByPhotographer = async (photographerId: string, startDate?: string, endDate?: string): Promise<Leave[]> => {
  let query = supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', photographerId);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;
  return data.map(rowToLeave);
};

// Get leaves for a specific date
export const getLeavesByDate = async (date: string): Promise<Leave[]> => {
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .eq('date', date)
    .order('applied_at', { ascending: false });

  if (error) throw error;
  return data.map(rowToLeave);
};

// Get all leaves (admin only)
export const getAllLeaves = async (startDate?: string, endDate?: string): Promise<Leave[]> => {
  let query = supabase.from('leaves').select('*');

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query.order('date', { ascending: false });

  if (error) throw error;
  return data.map(rowToLeave);
};

// Get a single leave by ID
export const getLeaveById = async (id: string): Promise<Leave | null> => {
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToLeave(data);
};

// Check if photographer is on leave for a specific date and half
export const isPhotographerOnLeave = async (photographerId: string, date: string, half: LeaveHalf): Promise<boolean> => {
  const { data, error } = await supabase
    .from('leaves')
    .select('id')
    .eq('photographer_id', photographerId)
    .eq('date', date)
    .eq('half', half)
    .limit(1);

  if (error) throw error;
  return data.length > 0;
};

// Create a new leave
export const createLeave = async (leave: Omit<Leave, 'id' | 'appliedAt'>): Promise<Leave> => {
  const insert: LeaveInsert = {
    photographer_id: leave.photographerId,
    date: leave.date,
    half: leave.half,
    applied_by: leave.appliedBy,
  };

  const { data, error } = await supabase
    .from('leaves')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToLeave(data);
};

// Update a leave
export const updateLeave = async (id: string, updates: Partial<Leave>): Promise<Leave> => {
  const update: LeaveUpdate = {
    photographer_id: updates.photographerId,
    date: updates.date,
    half: updates.half,
    applied_by: updates.appliedBy,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof LeaveUpdate] === undefined) {
      delete update[key as keyof LeaveUpdate];
    }
  });

  const { data, error } = await supabase
    .from('leaves')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToLeave(data);
};

// Delete a leave
export const deleteLeave = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('leaves')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
