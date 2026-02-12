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
export const createScreenshot = async (screenshot: Omit<Screenshot, 'id' | 'uploaded_at'>, client = supabase): Promise<Screenshot> => {
  const insert: ScreenshotInsert = {
    delivery_id: screenshot.delivery_id,
    user_id: screenshot.user_id,
    type: screenshot.type,
    file_url: screenshot.file_url,
    thumbnail_url: screenshot.thumbnail_url,
    deleted_at: screenshot.deleted_at ?? null,
  };

  const { data, error } = await client
    .from('screenshots')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToScreenshot(data);
};

// ... (skipping updateScreenshot/deleteScreenshot for now as they aren't the acute issue, but good to align)

// Upload a screenshot file to storage and return the public URL
export const uploadScreenshotFile = async (file: File, path: string, client = supabase): Promise<string> => {
  const { data, error } = await client.storage
    .from('screenshots')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false // Don't overwrite
    });

  if (error) throw error;

  const { data: { publicUrl } } = client.storage
    .from('screenshots')
    .getPublicUrl(path);

  return publicUrl;
};

// Get ALL screenshots (for Admin View)
export const getAllScreenshots = async (client = supabase): Promise<Screenshot[]> => {
  const { data, error } = await client
    .from('screenshots')
    .select('*')
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  if (error) throw error;
  return data.map(rowToScreenshot);
};
