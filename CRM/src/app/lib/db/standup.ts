import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { StandupCall } from '../../types';
import type { Database } from '../types/database.types';

type StandupRow = Database['public']['Tables']['users']['Row']; // generic mapping helper

export const getStandupCall = async (
  photographerId: string,
  date: string,
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<StandupCall | null> => {
  const { data, error } = await (supabaseClient.from('standup_calls') as any)
    .select('*')
    .eq('photographer_id', photographerId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw error;
  return data as StandupCall | null;
};

export const createStandupCall = async (
  call: Omit<StandupCall, 'id' | 'created_at' | 'updated_at'>,
  supabaseClient: SupabaseClient<Database> = supabase
): Promise<StandupCall> => {
  const { data, error } = await (supabaseClient.from('standup_calls') as any)
    .insert({
      photographer_id: call.photographer_id,
      date: call.date,
      status: call.status,
      confirmed_count: call.confirmed_count,
      call_log_screenshot_url: call.call_log_screenshot_url,
    })
    .select()
    .single();

  if (error) throw error;
  return data as StandupCall;
};
