import { useState, useCallback } from 'react';
import { uploadFile, deleteFile, UploadResult } from '@/lib/storage';
import { useFileUpload, FileWithPreview } from '@/modules/business/hooks/use-file-upload';

export interface SupabaseFileUploadOptions {
  bucket: string;
  folder?: string;
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  onUploadComplete?: (result: UploadResult) => void;
  onUploadError?: (error: string) => void;
}

export interface SupabaseFileUploadState {
  files: FileWithPreview[];
  isDragging: boolean;
  errors: string[];
  isUploading: boolean;
  uploadedUrls: string[];
}

export interface SupabaseFileUploadActions {
  uploadFiles: () => Promise<void>;
  removeFile: (id: string) => Promise<void>;
  clearFiles: () => void;
  clearErrors: () => void;
  handleDragEnter: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  openFileDialog: () => void;
  getInputProps: (props?: React.InputHTMLAttributes<HTMLInputElement>) => React.InputHTMLAttributes<HTMLInputElement>;
}

export const useSupabaseFileUpload = (
  options: SupabaseFileUploadOptions
): [SupabaseFileUploadState, SupabaseFileUploadActions] => {
  const {
    bucket,
    folder = '',
    maxFiles = 1,
    maxSize = 5 * 1024 * 1024, // 5MB default
    accept = 'image/*',
    multiple = false,
    onUploadComplete,
    onUploadError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const [fileUploadState, fileUploadActions] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    onFilesChange: () => {
      // Reset uploaded URLs when files change
      setUploadedUrls([]);
    },
  });

  const uploadFiles = useCallback(async () => {
    if (fileUploadState.files.length === 0) return;

    setIsUploading(true);
    const uploadPromises: Promise<UploadResult>[] = [];
    const errors: string[] = [];

    for (const fileWithPreview of fileUploadState.files) {
      // Only upload actual File objects, not FileMetadata
      if (fileWithPreview.file instanceof File) {
        const uploadPromise = uploadFile(fileWithPreview.file, {
          bucket,
          folder,
          fileName: fileWithPreview.file.name,
          upsert: true,
        });
        uploadPromises.push(uploadPromise);
      } else {
        // Skip FileMetadata objects as they're already uploaded
        console.log('Skipping FileMetadata object:', fileWithPreview.file.name);
      }
    }

    if (uploadPromises.length === 0) {
      setIsUploading(false);
      return;
    }

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads: string[] = [];

      results.forEach((result, index) => {
        if (result.error) {
          errors.push(`Failed to upload ${fileUploadState.files[index]?.file.name}: ${result.error}`);
          onUploadError?.(result.error);
        } else {
          successfulUploads.push(result.url);
          onUploadComplete?.(result);
        }
      });

      setUploadedUrls(successfulUploads);

      if (errors.length > 0) {
        // Update file upload state with errors
        fileUploadActions.clearErrors();
        // Note: We'd need to extend the useFileUpload hook to accept errors from outside
        console.error('Upload errors:', errors);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown upload error';
      errors.push(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [fileUploadState.files, bucket, folder, onUploadComplete, onUploadError, fileUploadActions]);

  const removeFile = useCallback(async (id: string) => {
    const fileToRemove = fileUploadState.files.find(file => file.id === id);
    if (!fileToRemove) return;

    // If the file was uploaded, delete it from storage
    const uploadedIndex = fileUploadState.files.findIndex(file => file.id === id);
    if (uploadedIndex !== -1 && uploadedUrls[uploadedIndex]) {
      const fileName = fileToRemove.file.name;
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      
      const deleteResult = await deleteFile(bucket, filePath);
      if (!deleteResult.success) {
        console.error('Failed to delete file from storage:', deleteResult.error);
      }
    }

    // Remove from local state
    fileUploadActions.removeFile(id);
    
    // Update uploaded URLs
    const newUploadedUrls = uploadedUrls.filter((_, index) => 
      fileUploadState.files[index]?.id !== id
    );
    setUploadedUrls(newUploadedUrls);
  }, [fileUploadState.files, uploadedUrls, bucket, folder, fileUploadActions]);

  const clearFiles = useCallback(() => {
    // Delete all uploaded files from storage
    uploadedUrls.forEach(async (url) => {
      // Extract path from URL and delete
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      
      await deleteFile(bucket, filePath);
    });

    fileUploadActions.clearFiles();
    setUploadedUrls([]);
  }, [uploadedUrls, bucket, folder, fileUploadActions]);

  return [
    {
      ...fileUploadState,
      isUploading,
      uploadedUrls,
    },
    {
      ...fileUploadActions,
      uploadFiles,
      removeFile,
      clearFiles,
    },
  ];
};
