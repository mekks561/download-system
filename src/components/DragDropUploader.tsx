import React, { useState, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/shadcn';
import { Button } from './ui/shadcn';
import { Badge } from './ui/shadcn';
import { Progress } from './ui/shadcn';
import { Separator } from './ui/shadcn';

export type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  preview?: string;
  uploadedUrl?: string;
}

export interface DragDropUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  onFileSelect?: (files: File[]) => void;
  onError?: (message: string) => void;
  accept?: string;
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  showPreview?: boolean;
  uploadImmediately?: boolean;
  customValidation?: (file: File) => string | null;
  _maxConcurrent?: number;
  disabled?: boolean;
  className?: string;
}

const DragDropUploader: React.FC<DragDropUploaderProps> = ({
  onUpload,
  onFileSelect,
  onError,
  accept = '*',
  maxSize = 100 * 1024 * 1024,
  maxFiles = 10,
  multiple = true,
  showPreview = true,
  uploadImmediately = true,
  customValidation,
  _maxConcurrent = 3,
  disabled = false,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
    onError?.(message);
    setTimeout(() => {
      setErrorMessage(null);
    }, 3000);
  }, [onError]);

  const generateFileId = () => {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const getAcceptedTypes = () => {
    if (accept === '*') return null;
    return accept.split(',').map(t => t.trim());
  };

  const validateFile = useCallback((file: File): string | null => {
    const acceptedTypes = getAcceptedTypes();
    
    if (acceptedTypes) {
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', '/'));
        }
        return file.type === type;
      });
      
      if (!isAccepted) {
        return `文件类型不支持：${file.type}`;
      }
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(0);
      return `文件大小超过限制（最大 ${maxSizeMB}MB）`;
    }

    if (customValidation) {
      return customValidation(file);
    }

    return null;
  }, [accept, maxSize, customValidation]);

  const getFilePreview = (file: File): string | undefined => {
    if (file.type.startsWith('image/')) {
      return URL.createObjectURL(file);
    }
    return undefined;
  };

  const addFilesToQueue = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const uploadItems: UploadFile[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);
      
      uploadItems.push({
        id: generateFileId(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        status: error ? 'failed' : 'pending',
        progress: 0,
        error: error || undefined,
        preview: showPreview ? getFilePreview(file) : undefined
      });

      if (!error) {
        validFiles.push(file);
      }
    }

    setUploadQueue(prev => [...prev, ...uploadItems]);

    if (validFiles.length > 0 && uploadImmediately) {
      void uploadFiles(validFiles);
    }

    onFileSelect?.(validFiles);
  }, [validateFile, showPreview, uploadImmediately, onFileSelect]);

  const uploadFiles = async (files: File[]) => {
    try {
      await onUpload(files);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (disabled) return;

    const { files } = e.dataTransfer;
    if (files && files.length > 0) {
      if (!multiple && files.length > 1) {
        handleError('此上传组件只允许选择一个文件');
        return;
      }
      addFilesToQueue(files);
    }
  }, [disabled, multiple, addFilesToQueue, handleError]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      if (!multiple && files.length > 1) {
        handleError('此上传组件只允许选择一个文件');
        return;
      }
      addFilesToQueue(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [multiple, addFilesToQueue, handleError]);

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const removeFile = useCallback((fileId: string) => {
    setUploadQueue(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setUploadQueue(prev => {
      return prev.filter(f => f.status !== 'completed');
    });
  }, []);

  const clearAll = useCallback(() => {
    setUploadQueue(prev => {
      prev.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
      return [];
    });
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string): string => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.startsWith('video/')) return '🎬';
    if (type.startsWith('audio/')) return '🎵';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type.includes('zip') || type.includes('rar') || type.includes('archive')) return '📦';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  const getStatusBadgeVariant = (status: UploadStatus): "default" | "secondary" | "success" | "warning" | "error" => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'uploading': return 'default';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      default: return 'secondary';
    }
  };

  const getStatusText = (status: UploadStatus, file: UploadFile): string => {
    switch (status) {
      case 'uploading': return `${file.progress}%`;
      case 'pending': return '等待上传';
      case 'completed': return '已完成';
      case 'failed': return file.error || '上传失败';
      case 'cancelled': return '已取消';
      default: return '';
    }
  };

  const pendingCount = uploadQueue.filter(f => f.status === 'pending').length;
  const completedCount = uploadQueue.filter(f => f.status === 'completed').length;
  const failedCount = uploadQueue.filter(f => f.status === 'failed').length;
  const totalCount = uploadQueue.length;

  const acceptedTypesDisplay = accept === '*' 
    ? '所有文件' 
    : accept.split(',').map(t => t.trim()).join(', ');

  return (
    <Card className={`w-full max-w-3xl overflow-hidden ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 bg-gray-50 py-4">
        <CardTitle className="text-base font-semibold text-gray-900">📤 文件上传</CardTitle>
        {totalCount > 0 && (
          <div className="flex gap-2">
            <Badge variant="secondary">总数: {totalCount}</Badge>
            <Badge variant="success">✅ {completedCount}</Badge>
            <Badge variant="error">❌ {failedCount}</Badge>
            <Badge variant="secondary">⏳ {pendingCount}</Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5">
        {errorMessage && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
            ⚠️ {errorMessage}
          </div>
        )}
        <div
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-16 text-center transition-all duration-300 ${
            isDragOver 
              ? 'border-primary-500 bg-blue-50 scale-[1.02]' 
              : 'border-gray-300 bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
          />
          
          <div className="pointer-events-none">
            <div className="mb-4 text-6xl">
              {isDragOver ? '📥' : '📤'}
            </div>
            <div className="mb-3 text-lg font-semibold text-gray-900">
              {isDragOver ? '释放以上传文件' : '拖拽文件到此处，或点击选择'}
            </div>
            <div className="text-sm text-gray-500 leading-relaxed">
              支持: {acceptedTypesDisplay}
              {maxSize && ` | 最大: ${formatFileSize(maxSize)}`}
              {maxFiles && ` | 最多: ${maxFiles} 个文件`}
            </div>
          </div>
        </div>

        {uploadQueue.length > 0 && (
          <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">📋 上传队列</span>
              <div className="flex gap-2">
                {completedCount > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clearCompleted}
                  >
                    清除已完成
                  </Button>
                )}
                {totalCount > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={clearAll}
                  >
                    清空全部
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {uploadQueue.map((uploadFile) => (
                <div key={uploadFile.id} className="flex items-center gap-3 border-b border-gray-100 p-4 transition-colors last:border-b-0">
                  {uploadFile.preview ? (
                    <img
                      src={uploadFile.preview}
                      alt={uploadFile.name}
                      className="h-12 w-12 rounded-md border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-3xl">
                      {getFileIcon(uploadFile.type)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">{uploadFile.name}</div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                      <span className="text-gray-400">
                        {formatFileSize(uploadFile.size)}
                      </span>
                      <Badge variant={getStatusBadgeVariant(uploadFile.status)} className="font-medium">
                        {getStatusText(uploadFile.status, uploadFile)}
                      </Badge>
                    </div>

                    {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="h-1" />
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => removeFile(uploadFile.id)}
                    title="移除"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="bg-gray-50 py-3">
        <p className="w-full text-center text-xs text-gray-400">
          💡 提示：支持拖拽多个文件上传，拖拽过程中文件会自动排队
        </p>
      </CardFooter>
    </Card>
  );
};

export default DragDropUploader;
