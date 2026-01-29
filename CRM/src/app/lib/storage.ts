import { supabase } from './supabase';

const SCREENSHOT_BUCKET = 'screenshots';
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// Generate thumbnail from image (client-side)
const generateThumbnail = (file: File, maxWidth: number = 300, maxHeight: number = 300): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate thumbnail'));
              return;
            }
            const thumbnailFile = new File([blob], `thumb_${file.name}`, { type: 'image/jpeg' });
            resolve(thumbnailFile);
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Validate file before upload
export const validateScreenshotFile = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  return { valid: true };
};

// Upload screenshot file
export const uploadScreenshot = async (
  file: File,
  deliveryId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ fileUrl: string; thumbnailUrl: string }> => {
  // Validate file
  const validation = validateScreenshotFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate file paths
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop();
  const fileName = `${deliveryId}/${userId}/${timestamp}.${fileExt}`;
  const thumbnailFileName = `${deliveryId}/${userId}/${timestamp}_thumb.jpg`;

  try {
    // Generate thumbnail
    const thumbnailFile = await generateThumbnail(file);

    // Upload main file
    const { data: fileData, error: fileError } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (fileError) throw fileError;

    // Upload thumbnail
    const { data: thumbData, error: thumbError } = await supabase.storage
      .from(SCREENSHOT_BUCKET)
      .upload(thumbnailFileName, thumbnailFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (thumbError) {
      // If thumbnail upload fails, try to delete the main file
      await supabase.storage.from(SCREENSHOT_BUCKET).remove([fileName]);
      throw thumbError;
    }

    // Get public URLs
    const { data: fileUrlData } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(fileName);
    const { data: thumbUrlData } = supabase.storage.from(SCREENSHOT_BUCKET).getPublicUrl(thumbnailFileName);

    return {
      fileUrl: fileUrlData.publicUrl,
      thumbnailUrl: thumbUrlData.publicUrl,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to upload screenshot');
  }
};

// Delete screenshot file
export const deleteScreenshot = async (fileUrl: string, thumbnailUrl: string): Promise<void> => {
  try {
    // Extract file paths from URLs
    const filePath = fileUrl.split(`${SCREENSHOT_BUCKET}/`)[1];
    const thumbPath = thumbnailUrl.split(`${SCREENSHOT_BUCKET}/`)[1];

    const pathsToDelete = [filePath];
    if (thumbPath) pathsToDelete.push(thumbPath);

    const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).remove(pathsToDelete);

    if (error) throw error;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to delete screenshot');
  }
};

// Initialize storage bucket (should be called once by admin)
export const initializeStorageBucket = async (): Promise<void> => {
  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) throw listError;

  const bucketExists = buckets?.some((bucket) => bucket.name === SCREENSHOT_BUCKET);

  if (!bucketExists) {
    // Create bucket with public read access
    const { error: createError } = await supabase.storage.createBucket(SCREENSHOT_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: ALLOWED_TYPES,
    });

    if (createError) throw createError;
  }
};
