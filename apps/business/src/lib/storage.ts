import { supabase } from '@/lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export interface UploadOptions {
  bucket: string;
  folder?: string;
  fileName?: string;
  upsert?: boolean;
}

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    const { bucket, folder = '', fileName, upsert = false } = options;
    
    // Generate a unique filename if not provided
    const finalFileName = fileName || `${Date.now()}-${file.name}`;
    const filePath = folder ? `${folder}/${finalFileName}` : finalFileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert,
        cacheControl: '3600',
      });

    if (error) {
      return {
        url: '',
        path: '',
        error: error.message,
      };
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    return {
      url: '',
      path: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Deletes a file from Supabase Storage
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Creates a storage bucket if it doesn't exist
 */
export async function createBucket(
  bucketName: string,
  isPublic: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880, // 5MB
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
