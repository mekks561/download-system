import React, { useRef, useState, useCallback } from 'react';
import './Upload.css';

export interface UploadFile {
  uid: string;
  name: string;
  status: 'done' | 'error' | 'uploading' | 'waiting';
  size?: number;
  percent?: number;
  url?: string;
  error?: string;
}

export interface UploadProps {
  action: string;
  accept?: string;
  multiple?: boolean;
  fileList?: UploadFile[];
  defaultFileList?: UploadFile[];
  onChange?: (fileList: UploadFile[]) => void;
  onProgress?: (percent: number, file: UploadFile) => void;
  onSuccess?: (response: any, file: UploadFile) => void;
  onError?: (error: Error, file: UploadFile) => void;
  beforeUpload?: (file: File) => boolean | Promise<File>;
  headers?: { [key: string]: string };
  data?: { [key: string]: any };
  className?: string;
}

const Upload: React.FC<UploadProps> = ({
  action,
  accept,
  multiple = false,
  fileList: controlledFileList,
  defaultFileList = [],
  onChange,
  onProgress,
  onSuccess,
  onError,
  beforeUpload,
  headers = {},
  data = {},
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalFileList, setInternalFileList] = useState<UploadFile[]>(defaultFileList);

  const fileList = controlledFileList !== undefined ? controlledFileList : internalFileList;

  const updateFileList = useCallback((updater: (list: UploadFile[]) => UploadFile[]) => {
    const newList = updater(fileList);
    if (!controlledFileList) {
      setInternalFileList(newList);
    }
    onChange?.(newList);
  }, [fileList, controlledFileList, onChange]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = (uid: string) => {
    updateFileList((list) => list.filter((file) => file.uid !== uid));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    const processFiles = async () => {
      for (const file of fileArray) {
        if (beforeUpload) {
          const result = beforeUpload(file);
          if (result instanceof Promise) {
            try {
              await result;
            } catch {
              continue;
            }
          } else if (!result) {
            continue;
          }
        }

        const newFile: UploadFile = {
          uid: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          status: 'uploading',
          size: file.size,
          percent: 0,
        };

        updateFileList((list) => [...list, newFile]);
        uploadFile(file, newFile);
      }
    };

    processFiles();
    e.target.value = '';
  };

  const uploadFile = async (file: File, uploadFileItem: UploadFile) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(data).forEach((key) => {
      formData.append(key, data[key]);
    });

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress?.(percent, uploadFileItem);
          updateFileList((list) =>
            list.map((item) =>
              item.uid === uploadFileItem.uid ? { ...item, percent } : item
            )
          );
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText || '{}');
          onSuccess?.(response, uploadFileItem);
          updateFileList((list) =>
            list.map((item) =>
              item.uid === uploadFileItem.uid
                ? { ...item, status: 'done' as const, percent: 100 }
                : item
            )
          );
        } else {
          const error = new Error(`Upload failed with status ${xhr.status}`);
          onError?.(error, uploadFileItem);
          updateFileList((list) =>
            list.map((item) =>
              item.uid === uploadFileItem.uid
                ? { ...item, status: 'error' as const, error: error.message }
                : item
            )
          );
        }
      });

      xhr.addEventListener('error', () => {
        const error = new Error('Network error');
        onError?.(error, uploadFileItem);
        updateFileList((list) =>
          list.map((item) =>
            item.uid === uploadFileItem.uid
              ? { ...item, status: 'error' as const, error: error.message }
              : item
          )
        );
      });

      xhr.open('POST', action, true);
      Object.keys(headers).forEach((key) => {
        xhr.setRequestHeader(key, headers[key]);
      });
      xhr.send(formData);
    } catch (error) {
      onError?.(error as Error, uploadFileItem);
      updateFileList((list) =>
        list.map((item) =>
          item.uid === uploadFileItem.uid
            ? { ...item, status: 'error' as const, error: (error as Error).message }
            : item
        )
      );
    }
  };

  const formatSize = (size?: number): string => {
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`upload${className ? ` ${className}` : ''}`}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="upload-input"
        onChange={handleFileChange}
      />
      <div className="upload-area" onClick={handleClick}>
        <div className="upload-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="upload-text">点击或拖拽上传文件</p>
        {accept && <p className="upload-hint">支持 {accept}</p>}
      </div>

      {fileList.length > 0 && (
        <div className="upload-list">
          {fileList.map((file) => (
            <div key={file.uid} className={`upload-item upload-item-${file.status}`}>
              <div className="upload-item-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {file.status === 'done' ? (
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  ) : file.status === 'error' ? (
                    <circle cx="12" cy="12" r="10" />
                  ) : (
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  )}
                </svg>
              </div>
              <div className="upload-item-info">
                <span className="upload-item-name">{file.name}</span>
                <span className="upload-item-size">{formatSize(file.size)}</span>
              </div>
              {file.status === 'uploading' && file.percent !== undefined && (
                <div className="upload-item-progress">
                  <div
                    className="upload-item-progress-bar"
                    style={{ width: `${file.percent}%` }}
                  />
                </div>
              )}
              {file.status === 'error' && (
                <span className="upload-item-error">{file.error}</span>
              )}
              <button
                className="upload-item-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(file.uid);
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Upload;