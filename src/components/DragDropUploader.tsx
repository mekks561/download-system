import React, { useState, useCallback, useRef } from 'react';

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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
        alert('此上传组件只允许选择一个文件');
        return;
      }
      addFilesToQueue(files);
    }
  }, [disabled, multiple, addFilesToQueue]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (files && files.length > 0) {
      if (!multiple && files.length > 1) {
        alert('此上传组件只允许选择一个文件');
        return;
      }
      addFilesToQueue(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [multiple, addFilesToQueue]);

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

  const getStatusColor = (status: UploadStatus): string => {
    switch (status) {
      case 'pending': return '#6b7280';
      case 'uploading': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'cancelled': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: UploadStatus): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '⬆️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'cancelled': return '🚫';
      default: return '📄';
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
    <div style={styles.container} className={className}>
      <div style={styles.header}>
        <h3 style={styles.title}>📤 文件上传</h3>
        {totalCount > 0 && (
          <div style={styles.stats}>
            <span style={styles.statItem}>总数: {totalCount}</span>
            <span style={styles.statItem}>✅ {completedCount}</span>
            <span style={styles.statItem}>❌ {failedCount}</span>
            <span style={styles.statItem}>⏳ {pendingCount}</span>
          </div>
        )}
      </div>

      <div
        style={{
          ...styles.dropZone,
          ...(isDragOver ? styles.dropZoneActive : {}),
          ...(disabled ? styles.dropZoneDisabled : {})
        }}
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
          style={styles.fileInput}
          disabled={disabled}
        />
        
        <div style={styles.dropZoneContent}>
          <div style={styles.dropIcon}>
            {isDragOver ? '📥' : '📤'}
          </div>
          <div style={styles.dropText}>
            {isDragOver ? '释放以上传文件' : '拖拽文件到此处，或点击选择'}
          </div>
          <div style={styles.dropHint}>
            支持: {acceptedTypesDisplay}
            {maxSize && ` | 最大: ${formatFileSize(maxSize)}`}
            {maxFiles && ` | 最多: ${maxFiles} 个文件`}
          </div>
        </div>
      </div>

      {uploadQueue.length > 0 && (
        <div style={styles.fileList}>
          <div style={styles.fileListHeader}>
            <span style={styles.fileListTitle}>📋 上传队列</span>
            <div style={styles.fileListActions}>
              {completedCount > 0 && (
                <button
                  style={styles.clearButton}
                  onClick={clearCompleted}
                >
                  清除已完成
                </button>
              )}
              {totalCount > 0 && (
                <button
                  style={styles.clearAllButton}
                  onClick={clearAll}
                >
                  清空全部
                </button>
              )}
            </div>
          </div>

          <div style={styles.fileListBody}>
            {uploadQueue.map((uploadFile) => (
              <div key={uploadFile.id} style={styles.fileItem}>
                {uploadFile.preview ? (
                  <img
                    src={uploadFile.preview}
                    alt={uploadFile.name}
                    style={styles.filePreview}
                  />
                ) : (
                  <div style={styles.fileIcon}>
                    {getFileIcon(uploadFile.type)}
                  </div>
                )}

                <div style={styles.fileInfo}>
                  <div style={styles.fileName}>{uploadFile.name}</div>
                  <div style={styles.fileMeta}>
                    <span style={styles.fileSize}>
                      {formatFileSize(uploadFile.size)}
                    </span>
                    <span style={{
                      ...styles.fileStatus,
                      color: getStatusColor(uploadFile.status)
                    }}>
                      {getStatusIcon(uploadFile.status)}
                      {uploadFile.status === 'uploading' && `${uploadFile.progress}%`}
                      {uploadFile.status === 'pending' && '等待上传'}
                      {uploadFile.status === 'completed' && '已完成'}
                      {uploadFile.status === 'failed' && (uploadFile.error || '上传失败')}
                      {uploadFile.status === 'cancelled' && '已取消'}
                    </span>
                  </div>

                  {(uploadFile.status === 'uploading' || uploadFile.status === 'pending') && (
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${uploadFile.progress}%`,
                          backgroundColor: getStatusColor(uploadFile.status)
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  style={styles.removeButton}
                  onClick={() => removeFile(uploadFile.id)}
                  title="移除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.footer}>
        <div style={styles.footerHint}>
          💡 提示：支持拖拽多个文件上传，拖拽过程中文件会自动排队
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  stats: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
  },
  statItem: {
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
  },
  dropZone: {
    margin: '20px',
    padding: '60px 40px',
    border: '2px dashed #d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textAlign: 'center' as const,
    backgroundColor: '#fafafa',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    transform: 'scale(1.02)',
  },
  dropZoneDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  fileInput: {
    display: 'none',
  },
  dropZoneContent: {
    pointerEvents: 'none',
  },
  dropIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  dropText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '12px',
  },
  dropHint: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: '1.6',
  },
  fileList: {
    margin: '0 20px 20px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  fileListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  fileListTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  fileListActions: {
    display: 'flex',
    gap: '8px',
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  clearAllButton: {
    padding: '6px 12px',
    backgroundColor: '#fee',
    color: '#dc2626',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  fileListBody: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.2s',
  },
  filePreview: {
    width: '48px',
    height: '48px',
    objectFit: 'cover',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  fileIcon: {
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a2e',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: '4px',
  },
  fileMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    color: '#6b7280',
  },
  fileSize: {
    color: '#9ca3af',
  },
  fileStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: '500',
  },
  progressBar: {
    marginTop: '8px',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  removeButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#fee',
    color: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    fontSize: '20px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footer: {
    padding: '12px 20px',
    backgroundColor: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  footerHint: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
  },
};

export default DragDropUploader;
