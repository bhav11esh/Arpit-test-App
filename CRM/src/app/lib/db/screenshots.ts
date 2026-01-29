import { supabase } from '../supabase';
import type { Screenshot, ScreenshotType } from '../../types';
import type { Database } from '../types/database.types';

type ScreenshotRow = Database['public']['Tables']['screenshots']['Row'];
type ScreenshotInsert = Database['public']['Tables']['screenshots']['Insert'];
type ScreenshotUpdate = Database['public']['Tables']['screenshots']['Update'];

// Convert database row to app type
const rowToScreenshot = (row: ScreenshotRow): Screenshot => ({
  id: row.id,
  delivery_id: row.delivery_id,
  user_id: row.user_id,
  type: row.type as ScreenshotType,
  file_url: row.file_url,
  thumbnail_url: row.thumbnail_url,
  uploaded_at: row.uploaded_at,
  deleted_at: row.deleted_at ?? undefined,
});

// Get screenshots for a delivery
export const getScreenshotsByDelivery = async (deliveryId: string): Promise<Screenshot[]> => {
  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('delivery_id', deliveryId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  return data.map(rowToScreenshot);
};

// Get screenshots by user
export const getScreenshotsByUser = async (userId: string): Promise<Screenshot[]> => {
  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data.map(rowToScreenshot);
};

// Get a single screenshot by ID
export const getScreenshotById = async (id: string): Promise<Screenshot | null> => {
  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return rowToScreenshot(data);
};

// Create a new screenshot
export const createScreenshot = async (screenshot: Omit<Screenshot, 'id' | 'uploaded_at'>): Promise<Screenshot> => {
  const insert: ScreenshotInsert = {
    delivery_id: screenshot.delivery_id,
    user_id: screenshot.user_id,
    type: screenshot.type,
    file_url: screenshot.file_url,
    thumbnail_url: screenshot.thumbnail_url,
    deleted_at: screenshot.deleted_at ?? null,
  };

  const { data, error } = await supabase
    .from('screenshots')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToScreenshot(data);
};

// Update a screenshot
export const updateScreenshot = async (id: string, updates: Partial<Screenshot>): Promise<Screenshot> => {
  const update: ScreenshotUpdate = {
    delivery_id: updates.delivery_id,
    user_id: updates.user_id,
    type: updates.type,
    file_url: updates.file_url,
    thumbnail_url: updates.thumbnail_url,
    deleted_at: updates.deleted_at ?? null,
  };

  Object.keys(update).forEach(key => {
    if (update[key as keyof ScreenshotUpdate] === undefined) {
      delete update[key as keyof ScreenshotUpdate];
    }
  });

  const { data, error } = await supabase
    .from('screenshots')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return rowToScreenshot(data);
};

// Soft delete a screenshot
export const deleteScreenshot = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('screenshots')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

// Permanently delete a screenshot
export const permanentlyDeleteScreenshot = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('screenshots')
    .delete()
    .eq('id', id);

  if (error) throw error;
};
