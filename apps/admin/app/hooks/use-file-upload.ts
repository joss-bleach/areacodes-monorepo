import { useRef, useState, type ChangeEvent, type DragEvent, type InputHTMLAttributes } from "react";

export type FileMetadata = {
  name: string;
  size: number;
  type: string;
  url: string;
  id: string;
};

export type FileWithPreview = {
  file: File | FileMetadata;
  id: string;
  preview?: string;
};

export type FileUploadOptions = {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  initialFiles?: FileMetadata[];
  onFilesChange?: (files: FileWithPreview[]) => void;
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void;
};

export const useFileUpload = (options: FileUploadOptions = {}) => {
  const {
    maxFiles = Infinity,
    maxSize = Infinity,
    accept = "*",
    multiple = false,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
  } = options;

  const [files, setFiles] = useState<FileWithPreview[]>(
    initialFiles.map((file) => ({ file, id: file.id, preview: file.url }))
  );
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File | FileMetadata): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
    }
    if (accept !== "*") {
      const acceptedTypes = accept.split(",").map((t) => t.trim());
      const fileType = file instanceof File ? file.type || "" : file.type;
      const fileExtension = `.${file.name.split(".").pop()}`;
      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith(".")) return fileExtension.toLowerCase() === type.toLowerCase();
        if (type.endsWith("/*")) return fileType.startsWith(`${type.split("/")[0]}/`);
        return fileType === type;
      });
      if (!isAccepted) return `File "${file.name}" is not an accepted file type.`;
    }
    return null;
  };

  const updateFiles = (newFiles: FileWithPreview[]) => {
    setFiles(newFiles);
    onFilesChange?.(newFiles);
  };

  const clearFiles = () => {
    files.forEach((f) => {
      if (f.preview && f.file instanceof File && f.file.type.startsWith("image/")) {
        URL.revokeObjectURL(f.preview);
      }
    });
    if (inputRef.current) inputRef.current.value = "";
    updateFiles([]);
    setErrors([]);
  };

  const addFiles = (newFiles: FileList | File[]) => {
    if (!newFiles || newFiles.length === 0) return;
    const newFilesArray = Array.from(newFiles);
    const newErrors: string[] = [];

    setErrors([]);
    if (!multiple) clearFiles();

    if (multiple && maxFiles !== Infinity && files.length + newFilesArray.length > maxFiles) {
      setErrors([`You can only upload a maximum of ${maxFiles} files.`]);
      return;
    }

    const validFiles: FileWithPreview[] = [];
    for (const file of newFilesArray) {
      if (multiple && files.some((f) => f.file.name === file.name && f.file.size === file.size)) {
        continue;
      }
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push({
          file,
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          preview: file instanceof File ? URL.createObjectURL(file) : undefined,
        });
      }
    }

    if (validFiles.length > 0) {
      onFilesAdded?.(validFiles);
      const merged = !multiple ? validFiles : [...files, ...validFiles];
      updateFiles(merged);
      setErrors(newErrors);
    } else if (newErrors.length > 0) {
      setErrors(newErrors);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    const fileToRemove = files.find((f) => f.id === id);
    if (fileToRemove?.preview && fileToRemove.file instanceof File && fileToRemove.file.type.startsWith("image/")) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    updateFiles(files.filter((f) => f.id !== id));
    setErrors([]);
  };

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (inputRef.current?.disabled) return;
    if (e.dataTransfer.files?.length > 0) {
      const firstFile = e.dataTransfer.files[0];
      addFiles(!multiple && firstFile ? [firstFile] : e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
  };

  const openFileDialog = () => inputRef.current?.click();

  const getInputProps = (props: InputHTMLAttributes<HTMLInputElement> = {}) => ({
    ...props,
    type: "file" as const,
    onChange: handleFileChange,
    accept: props.accept || accept,
    multiple: props.multiple ?? multiple,
    ref: inputRef as any,
  });

  return [
    { files, isDragging, errors },
    {
      addFiles,
      removeFile,
      clearFiles,
      clearErrors: () => setErrors([]),
      handleDragEnter: (e: DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); },
      handleDragLeave: (e: DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); },
      handleDragOver: (e: DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation(); },
      handleDrop,
      handleFileChange,
      openFileDialog,
      getInputProps,
    },
  ] as const;
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + (sizes[i] ?? "");
};
