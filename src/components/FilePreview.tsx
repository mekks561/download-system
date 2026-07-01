import React, { useState, useEffect } from 'react';

interface FileInfo {
  id: number;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  created_at: string;
}

interface FilePreviewProps {
  file: FileInfo | null;
  onClose: () => void;
  onDownload?: () => void;
}

type PreviewType = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported';

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pdfPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (file) {
      setLoading(true);
      setError(null);
      setCurrentPage(1);
      
      const img = new Image();
      img.onload = () => setLoading(false);
      img.onerror = () => {
        setLoading(false);
      };
      
      if (getPreviewType(file.mime_type) === 'image') {
        img.src = `/api/uploads/${file.id}/download`;
      }
    }
  }, [file]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullscreen) {
          setFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [fullscreen, onClose]);

  const getPreviewType = (mimeType: string): PreviewType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/') || 
        mimeType.includes('json') || 
        mimeType.includes('javascript')) return 'text';
    return 'unsupported';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive')) return '📦';
    return '📁';
  };

  const previewType = file ? getPreviewType(file.mime_type) : 'unsupported';
  const downloadUrl = file ? `/api/uploads/${file.id}/download` : '';

  if (!file) return null;

  const renderPreview = () => {
    switch (previewType) {
      case 'image':
        return (
          <div style={styles.previewContainer}>
            <img
              src={downloadUrl}
              alt={file.original_name}
              style={fullscreen ? styles.fullscreenImage : styles.previewImage}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('图片加载失败');
              }}
            />
          </div>
        );

      case 'video':
        return (
          <div style={styles.previewContainer}>
            <video
              controls
              style={fullscreen ? styles.fullscreenMedia : styles.previewMedia}
              src={downloadUrl}
              onLoadedData={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('视频加载失败');
              }}
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        );

      case 'audio':
        return (
          <div style={styles.audioContainer}>
            <div style={styles.audioIcon}>🎵</div>
            <div style={styles.audioInfo}>
              <div style={styles.fileName}>{file.original_name}</div>
              <div style={styles.fileSize}>{formatFileSize(file.file_size)}</div>
            </div>
            <audio
              controls
              style={styles.audioPlayer}
              src={downloadUrl}
              onLoadedData={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError('音频加载失败');
              }}
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        );

      case 'pdf':
        return (
          <div style={styles.pdfContainer}>
            <div style={styles.pdfHeader}>
              <span>📄 PDF 预览</span>
              <div style={styles.pdfControls}>
                <button
                  style={styles.pdfButton}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage <= 1}
                >
                  ◀ 上一页
                </button>
                <span style={styles.pageInfo}>
                  第 {currentPage} / {pdfPages} 页
                </span>
                <button
                  style={styles.pdfButton}
                  onClick={() => setCurrentPage(Math.min(pdfPages, currentPage + 1))}
                  disabled={currentPage >= pdfPages}
                >
                  下一页 ▶
                </button>
              </div>
            </div>
            <div style={styles.pdfFrame}>
              <iframe
                src={`${downloadUrl}#page=${currentPage}`}
                style={styles.pdfIframe}
                title="PDF Preview"
              />
            </div>
          </div>
        );

      case 'text':
        return (
          <div style={styles.textContainer}>
            <div style={styles.textHeader}>
              <span>📝 文本预览</span>
              <button
                style={styles.downloadButton}
                onClick={onDownload}
              >
                📥 下载文件
              </button>
            </div>
            <iframe
              src={downloadUrl}
              style={styles.textIframe}
              title="Text Preview"
              sandbox="allow-same-origin"
            />
          </div>
        );

      default:
        return (
          <div style={styles.unsupportedContainer}>
            <div style={styles.unsupportedIcon}>{getFileIcon(file.mime_type)}</div>
            <div style={styles.unsupportedText}>
              <h3>文件类型不支持预览</h3>
              <p>文件类型：{file.mime_type}</p>
              <p>您可以下载文件后在本地查看</p>
            </div>
            <button
              style={styles.downloadButton}
              onClick={onDownload}
            >
              📥 下载文件
            </button>
          </div>
        );
    }
  };

  return (
    <div 
      style={fullscreen ? styles.fullscreenOverlay : styles.overlay} 
      onClick={() => !fullscreen && onClose()}
    >
      <div 
        style={fullscreen ? styles.fullscreenModal : styles.modal} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={styles.fileInfo}>
            <span style={styles.fileIcon}>{getFileIcon(file.mime_type)}</span>
            <div style={styles.fileDetails}>
              <h3 style={styles.fileName}>{file.original_name}</h3>
              <p style={styles.fileMeta}>
                {formatFileSize(file.file_size)} | {file.mime_type}
              </p>
            </div>
          </div>
          <div style={styles.headerActions}>
            {previewType === 'image' && (
              <button
                style={styles.iconButton}
                onClick={() => setFullscreen(!fullscreen)}
                title={fullscreen ? '退出全屏' : '全屏预览'}
              >
                {fullscreen ? '⊠' : '⛶'}
              </button>
            )}
            {onDownload && (
              <button
                style={styles.iconButton}
                onClick={onDownload}
                title="下载文件"
              >
                ⬇️
              </button>
            )}
            <button
              style={styles.closeButton}
              onClick={onClose}
              title="关闭"
            >
              ×
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {loading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.spinner}>⏳</div>
              <p>加载中...</p>
            </div>
          )}
          
          {error && (
            <div style={styles.errorOverlay}>
              <div style={styles.errorIcon}>❌</div>
              <p>{error}</p>
            </div>
          )}
          
          {!loading && !error && renderPreview()}
        </div>

        <div style={styles.footer}>
          <div style={styles.previewInfo}>
            预览类型：<strong>{previewType === 'unsupported' ? '不支持' : previewType}</strong>
          </div>
          <div style={styles.keyboardHint}>
            按 <kbd style={styles.kbd}>ESC</kbd> 关闭
            {previewType === 'image' && (
              <> | 按 <kbd style={styles.kbd}>F</kbd> 全屏</>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  fullscreenOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10001,
  },
  modal: {
    width: '900px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  fullscreenModal: {
    width: '100vw',
    height: '100vh',
    backgroundColor: 'black',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  fileIcon: {
    fontSize: '32px',
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  fileMeta: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#6b7280',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    width: '36px',
    height: '36px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: '36px',
    height: '36px',
    backgroundColor: '#fee',
    color: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    fontSize: '24px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  previewContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '8px',
  },
  previewMedia: {
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: '8px',
  },
  fullscreenImage: {
    maxWidth: '100vw',
    maxHeight: '100vh',
    objectFit: 'contain',
  },
  fullscreenMedia: {
    maxWidth: '100vw',
    maxHeight: '100vh',
  },
  audioContainer: {
    width: '100%',
    maxWidth: '600px',
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '12px',
    textAlign: 'center',
  },
  audioIcon: {
    fontSize: '64px',
    marginBottom: '20px',
  },
  audioInfo: {
    marginBottom: '20px',
  },
  audioPlayer: {
    width: '100%',
    height: '40px',
  },
  pdfContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  pdfHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  pdfControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pdfButton: {
    padding: '6px 12px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  pdfFrame: {
    flex: 1,
    overflow: 'auto',
  },
  pdfIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  textContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'white',
  },
  textHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  textIframe: {
    flex: 1,
    border: 'none',
    fontFamily: 'monospace',
    padding: '20px',
  },
  unsupportedContainer: {
    width: '100%',
    maxWidth: '500px',
    padding: '60px 40px',
    backgroundColor: 'white',
    borderRadius: '12px',
    textAlign: 'center',
  },
  unsupportedIcon: {
    fontSize: '80px',
    marginBottom: '20px',
  },
  unsupportedText: {
    marginBottom: '30px',
  },
  downloadButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
  },
  spinner: {
    fontSize: '48px',
    animation: 'spin 1s linear infinite',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
  },
  errorIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    fontSize: '13px',
    color: '#6b7280',
  },
  previewInfo: {
    fontWeight: '500',
  },
  keyboardHint: {
    fontSize: '12px',
  },
  kbd: {
    padding: '2px 6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
};

export default FilePreview;
