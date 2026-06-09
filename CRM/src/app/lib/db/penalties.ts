import { supabase } from '../supabase';

/**
 * Fetch the forgiven penalty types for a photographer and a specific month.
 * Month format should be 'YYYY-MM' (e.g. '2026-05').
 */
export async function getPenaltyForgiveness(photographerId: string, month: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('penalty_forgiveness')
    .select('penalty_type')
    .eq('photographer_id', photographerId)
    .eq('month', month);

  if (error) {
    console.error('Error fetching penalty forgiveness:', error);
    throw error;
  }

  return (data || []).map((row: any) => row.penalty_type);
}

/**
 * Forgive a specific penalty type for a photographer and month.
 */
export async function forgivePenalty(
  photographerId: string,
  month: string,
  penaltyType: 'EMERGENCY_LEAVE' | 'SEND_UPDATE'
): Promise<void> {
  const { error } = await supabase
    .from('penalty_forgiveness')
    .upsert(
      {
        photographer_id: photographerId,
        month,
        penalty_type: penaltyType,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'photographer_id,month,penalty_type' }
    );

  if (error) {
    console.error('Error forgiving penalty:', error);
    throw error;
  }
}

/**
 * Unforgive a specific penalty type for a photographer and month (re-apply penalty).
 */
export async function unforgivePenalty(
  photographerId: string,
  month: string,
  penaltyType: 'EMERGENCY_LEAVE' | 'SEND_UPDATE'
): Promise<void> {
  const { error } = await supabase
    .from('penalty_forgiveness')
    .delete()
    .eq('photographer_id', photographerId)
    .eq('month', month)
    .eq('penalty_type', penaltyType);

  if (error) {
    console.error('Error unforgiving penalty:', error);
    throw error;
  }
}
