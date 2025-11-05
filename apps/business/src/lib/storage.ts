import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { env } from '@/config/env';

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
 * Gets an admin Supabase client with service role key for server-side operations
 */
function getAdminSupabaseClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Uploads a file to Supabase Storage (server-side)
 * Uses admin client with service role key to bypass RLS
 */
export async function uploadFileServer(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        url: '',
        path: '',
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured. Please add it to your environment variables.',
      };
    }

    const adminClient = getAdminSupabaseClient();
    const { bucket, folder = '', fileName, upsert = false } = options;
    
    // Generate a unique filename if not provided
    const finalFileName = fileName || `${Date.now()}-${file.name}`;
    const filePath = folder ? `${folder}/${finalFileName}` : finalFileName;

    const { data, error } = await adminClient.storage
      .from(bucket)
      .upload(filePath, file, {
        upsert,
        cacheControl: '3600',
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        url: '',
        path: '',
        error: error.message,
      };
    }

    // Get the public URL
    const { data: urlData } = adminClient.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Upload file server error:', error);
    return {
      url: '',
      path: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
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
 * Extracts file path from Supabase storage URL
 * Example: https://xxx.supabase.co/storage/v1/object/vouchers/images/file.png -> images/file.png
 */
export function extractFilePathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url);
    // Supabase storage URLs have format: /storage/v1/object/{bucket}/{path}
    const pathMatch = urlObj.pathname.match(new RegExp(`/storage/v1/object/${bucket}/(.+)`));
    if (pathMatch && pathMatch[1]) {
      const extractedPath = decodeURIComponent(pathMatch[1]);
      // Validate that the path is not empty and doesn't contain dangerous patterns
      if (extractedPath && extractedPath.length > 0 && !extractedPath.includes('..')) {
        return extractedPath;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deletes a file from Supabase Storage (server-side)
 * Uses admin client with service role key to bypass RLS
 */
export async function deleteFileServer(
  bucket: string,
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured',
      };
    }

    // Validate path to prevent accidental deletion of multiple files
    if (!path || path.length === 0 || path.includes('..') || path.startsWith('/')) {
      return {
        success: false,
        error: 'Invalid file path provided',
      };
    }

    // Ensure we're only deleting from allowed buckets
    if (bucket !== 'vouchers' && bucket !== 'company-logos') {
      return {
        success: false,
        error: `Cannot delete from bucket ${bucket}. Only vouchers and company-logos buckets are allowed.`,
      };
    }

    const adminClient = getAdminSupabaseClient();
    
    console.log(`Attempting to delete file from bucket "${bucket}" with path: "${path}"`);
    
    const { data, error } = await adminClient.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Supabase delete error:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        bucket,
        path,
      });
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }

    // Check if deletion was successful
    // If data is null or empty array, the file might not have existed
    if (data === null || (Array.isArray(data) && data.length === 0)) {
      console.warn(`File may not exist or was already deleted: ${path}`);
      // Still return success as the file is effectively gone
      return { success: true };
    }

    console.log(`Successfully deleted file: ${path}`);
    return { success: true };
  } catch (error) {
    console.error('Delete file server error:', error);
    return {
      success: false,
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
 * Uses admin client with service role key to bypass RLS
 */
export async function createBucket(
  bucketName: string,
  isPublic: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = getAdminSupabaseClient();
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
    
    if (!listError && buckets) {
      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      if (bucketExists) {
        return { success: true };
      }
    }

    const { error } = await adminClient.storage.createBucket(bucketName, {
      public: isPublic,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880, // 5MB
    });

    if (error) {
      // If bucket already exists, that's okay
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        return { success: true };
      }
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
