
import { supabase, adminSupabase } from '../supabase';
import type { Database } from '../types/database.types';
import type { Leave, LeaveHalf, LeaveAppliedBy } from '../../types';

type LeaveRow = Database['public']['Tables']['leaves']['Row'];
type LeaveInsert = Database['public']['Tables']['leaves']['Insert'];

/**
 * Helper to map DB row to App type (snake_case -> camelCase)
 */
const rowToLeave = (row: LeaveRow): Leave => ({
  id: row.id,
  photographerId: row.photographer_id,
  date: row.date,
  half: row.half as LeaveHalf,
  appliedBy: row.applied_by as LeaveAppliedBy,
  appliedAt: row.applied_at
});

/**
 * Get all leaves (used by LeaveContext)
 */
export async function getAllLeaves(): Promise<Leave[]> {
  const { data, error } = await supabase
    .from('leaves')
    .select('*')
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching all leaves:', error);
    throw error;
  }

  return (data || []).map(rowToLeave);
}

/**
 * Get leaves for a specific photographer (used by LeaveManagement and context)
 */
export async function getLeaves(photographerId: string, startDate?: string, endDate?: string): Promise<Leave[]> {
  let query = supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', photographerId)
    .order('date', { ascending: true });

  if (startDate) {
    query = query.gte('date', startDate);
  }

  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user leaves:', error);
    throw error;
  }

  return (data || []).map(rowToLeave);
}

/**
 * Check if a photographer is on leave (used by LeaveContext)
 */
export async function isPhotographerOnLeave(
  photographerId: string,
  date: string,
  half: LeaveHalf
): Promise<boolean> {
  const { count, error } = await supabase
    .from('leaves')
    .select('*', { count: 'exact', head: true })
    .eq('photographer_id', photographerId)
    .eq('date', date)
    .eq('half', half);

  if (error) {
    console.error('Error checking leave status:', error);
    throw error;
  }

  return (count || 0) > 0;
}

/**
 * Create a leave record (used by LeaveContext)
 */
export async function createLeave(leaveData: {
  photographerId: string;
  date: string;
  half: LeaveHalf;
  appliedBy: LeaveAppliedBy;
}): Promise<Leave> {
  return applyLeave({
    photographer_id: leaveData.photographerId,
    date: leaveData.date,
    half: leaveData.half,
    applied_by: leaveData.appliedBy
  });
}

/**
 * Apply for leave with V1 side effects (used by LeaveManagement and createLeave)
 * SIDE EFFECT: Auto-unassign PRIMARY deliveries
 */
export async function applyLeave(leaveData: LeaveInsert): Promise<Leave> {
  // 1. Create leave record (Upsert with ignoreDuplicates to handle race conditions/stale state)
  const { data: insertedData, error } = await (supabase.from('leaves') as any)
    .upsert(leaveData, { onConflict: 'photographer_id, date, half', ignoreDuplicates: true })
    .select();

  if (error) {
    console.error('Error applying leave:', error);
    throw error;
  }

  let leaveRecord = insertedData?.[0];

  // If ignoreDuplicates triggered, no row is returned. fetch the existing one.
  if (!leaveRecord) {
    const { data: existingData, error: fetchError } = await (supabase.from('leaves') as any)
      .select('*')
      .eq('photographer_id', leaveData.photographer_id)
      .eq('date', leaveData.date)
      .eq('half', leaveData.half)
      .single();

    if (fetchError || !existingData) {
      throw new Error('Failed to retrieve existing leave record after conflict');
    }
    leaveRecord = existingData;
  }

  // 2. V1 SPEC (EXPANDED): Auto-unassign based on leave status
  // Fetch all leaves for this user+date to check for Full Day status
  const { data: allDayLeaves, error: leavesFetchError } = await (supabase.from('leaves') as any)
    .select('half')
    .eq('photographer_id', leaveData.photographer_id)
    .eq('date', leaveData.date);

  if (leavesFetchError) {
    console.error('Error checking for full day leave status:', leavesFetchError);
  }

  // A photographer has Full Day leave if they have both FIRST_HALF and SECOND_HALF recorded
  const hasFirstHalf = allDayLeaves?.some((l: any) => l.half === 'FIRST_HALF');
  const hasSecondHalf = allDayLeaves?.some((l: any) => l.half === 'SECOND_HALF');
  const isFullDay = hasFirstHalf && hasSecondHalf;

  // Build unassignment query
  let unassignQuery = (supabase.from('deliveries') as any)
    .select('id')
    .eq('assigned_user_id', leaveData.photographer_id)
    .eq('date', leaveData.date)
    .neq('status', 'DONE');

  // If NOT a full day, we only unassign PRIMARY deliveries (V1 baseline)
  // If it IS a full day, we unassign EVERYTHING (any showroom)
  if (!isFullDay) {
    unassignQuery = unassignQuery.eq('showroom_type', 'PRIMARY');
  }

  const { data: deliveriesToUnassign, error: deliveriesFetchError } = await unassignQuery;

  if (deliveriesFetchError) {
    console.error('Error fetching deliveries for auto-unassignment:', deliveriesFetchError);
  }

  if (deliveriesToUnassign && deliveriesToUnassign.length > 0) {
    const idsToUnassign = deliveriesToUnassign.map((d: any) => d.id);
    const client = adminSupabase || supabase; // V1 FIX: Use Admin client to bypass RLS for auto-unassignment

    const { error: unassignError } = await client
      .from('deliveries' as any)
      .update({
        status: 'UNASSIGNED',
        assigned_user_id: null,
        unassignment_reason: isFullDay ? `Full Day Leave applied` : `Half Day Leave applied`,
        unassignment_timestamp: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .in('id', idsToUnassign);

    if (unassignError) {
      console.error('Error auto-unassigning deliveries:', unassignError);
    }
  }

  return rowToLeave(leaveRecord);
}

/**
 * Delete leave (Admin only)
 */
export async function deleteLeave(leaveId: string): Promise<void> {
  const client = adminSupabase || supabase;

  const { error } = await (client.from('leaves') as any)
    .delete()
    .eq('id', leaveId);

  if (error) {
    console.error('Error deleting leave:', error);
    throw error;
  }
}
