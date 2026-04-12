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
  showroom_code: (row as any).showroom_code,
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

// Get screenshots for multiple deliveries
export const getScreenshotsByDeliveries = async (deliveryIds: string[]): Promise<Map<string, Screenshot[]>> => {
  if (deliveryIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('screenshots')
    .select('*')
    .in('delivery_id', deliveryIds)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;

  const result = new Map<string, Screenshot[]>();
  data?.forEach(row => {
    const screenshot = rowToScreenshot(row);
    if (!result.has(screenshot.delivery_id)) {
      result.set(screenshot.delivery_id, []);
    }
    result.get(screenshot.delivery_id)?.push(screenshot);
  });
  return result;
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
    showroom_code: (screenshot as any).showroom_code ?? null,
    user_id: screenshot.user_id,
    type: screenshot.type,
    file_url: screenshot.file_url,
    thumbnail_url: screenshot.thumbnail_url,
    deleted_at: screenshot.deleted_at ?? null,
  };

  const { data, error } = await (client.from('screenshots') as any)
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return rowToScreenshot(data);
};

// Delete a single screenshot (Admin only) (Hard Delete Storage + Soft Delete DB)
export const deleteScreenshotById = async (id: string, client = supabase): Promise<void> => {
  // 1. Fetch the screenshot to get its path
  const { data: screenshot, error: fetchError } = await client
    .from('screenshots')
    .select('file_url')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // 2. Remove file from Supabase Storage
  if (screenshot && screenshot.file_url) {
    const parts = screenshot.file_url.split('/screenshots/');
    if (parts.length > 1) {
      const path = parts[1];
      console.log(`🗑️ Storage: Deleting single file ${path}...`);
      const { error: storageError } = await client.storage
        .from('screenshots')
        .remove([path]);
      
      if (storageError) {
        console.warn('Non-critical: Failed to remove file from Storage:', storageError);
      }
    }
  }

  // 3. Mark the database record as deleted
  const { error } = await client
    .from('screenshots')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
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
    .order('uploaded_at', { ascending: false })
    .limit(1000); // V5.5 SCALABILITY FIX: Prevent downloading millions of records

  if (error) throw error;
  return data.map(rowToScreenshot);
};

// Delete all screenshots (Admin only) (Hard Delete: DB + Storage)
export const deleteAllScreenshots = async (client = supabase): Promise<void> => {
  // 1. Fetch ALL screenshot paths
  const { data: screenshots, error: fetchError } = await client
    .from('screenshots')
    .select('file_url');

  if (fetchError) {
    console.error('Error fetching all screenshot paths:', fetchError);
  }

  // 2. Extract paths
  const pathsToDelete = (screenshots as { file_url: string }[] || [])
    .map(s => {
      const parts = s.file_url.split('/screenshots/');
      return parts.length > 1 ? parts[1] : null;
    })
    .filter((path): path is string => !!path);

  // 3. Purge storage
  if (pathsToDelete.length > 0) {
    console.log(`⚠️ EMERGENCY PURGE: Deleting ${pathsToDelete.length} files from storage...`);
    // Chunk storage removal to avoid payload size limits
    const storageChunkSize = 100;
    for (let i = 0; i < pathsToDelete.length; i += storageChunkSize) {
      const chunk = pathsToDelete.slice(i, i + storageChunkSize);
      await client.storage.from('screenshots').remove(chunk);
    }
  }

  // 4. Delete the database records
  const { error } = await client
    .from('screenshots')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) throw error;
};

// Delete screenshots for multiple deliveries (Hard Delete: DB + Storage)
export const deleteScreenshotsByDeliveryIds = async (deliveryIds: string[], client = supabase): Promise<void> => {
  if (deliveryIds.length === 0) return;

  // 1. Fetch the file paths for the screenshots we are about to delete
  // This is necessary to remove them from Storage
  const { data: screenshots, error: fetchError } = await client
    .from('screenshots')
    .select('file_url')
    .in('delivery_id', deliveryIds);

  if (fetchError) {
    console.error('Error fetching screenshot paths for deletion:', fetchError);
  }

  // 2. Extract paths from the public URLs
  // file_url format: https://[ref].supabase.co/storage/v1/object/public/screenshots/[path]
  const pathsToDelete = (screenshots as { file_url: string }[] || [])
    .map(s => {
      const parts = s.file_url.split('/screenshots/');
      return parts.length > 1 ? parts[1] : null;
    })
    .filter((path): path is string => !!path);

  // 3. Remove files from Supabase Storage
  if (pathsToDelete.length > 0) {
    console.log(`🗑️ Storage: Deleting ${pathsToDelete.length} files from bucket...`);
    const { error: storageError } = await client.storage
      .from('screenshots')
      .remove(pathsToDelete);
    
    if (storageError) {
      console.warn('Non-critical: Failed to remove some files from Storage:', storageError);
    }
  }

  // 4. Delete the database records
  const chunkSize = 50;
  for (let i = 0; i < deliveryIds.length; i += chunkSize) {
    const chunk = deliveryIds.slice(i, i + chunkSize);
    const { error } = await client
      .from('screenshots')
      .delete()
      .in('delivery_id', chunk);

    if (error) throw error;
  }
};
