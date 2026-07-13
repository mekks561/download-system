import React, { useState, useEffect, useCallback } from 'react';

interface PreviewFile {
  id: number;
  original_name: string;
}

interface FilePreviewProps {
  isOpen?: boolean;
  onClose: () => void;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  file?: PreviewFile;
  onDownload?: () => void;
}

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
const textExtensions = ['txt', 'md', 'json', 'xml', 'csv', 'log', 'js', 'ts', 'html', 'css'];
const pdfExtension = ['pdf'];

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function getFileType(fileName: string): 'image' | 'text' | 'pdf' | 'other' {
  const ext = getFileExtension(fileName);
  if (imageExtensions.includes(ext)) return 'image';
  if (textExtensions.includes(ext)) return 'text';
  if (pdfExtension.includes(ext)) return 'pdf';
  return 'other';
}

const FilePreview: React.FC<FilePreviewProps> = ({ isOpen, onClose, fileName, filePath, fileType, file, onDownload }) => {
  const [previewType, setPreviewType] = useState<'image' | 'text' | 'pdf' | 'other'>('other');
  const [textContent, setTextContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentFileName = fileName || file?.original_name || '';

  useEffect(() => {
    const isVisible = isOpen !== undefined ? isOpen : !!file;
    if (isVisible && currentFileName) {
      const type = fileType ? getFileType(fileType) : getFileType(currentFileName);
      setPreviewType(type);
      setTextContent('');
      setError('');
      
      if (type === 'text' && filePath) {
        void loadTextContent();
      }
    }
  }, [isOpen, currentFileName, filePath, fileType, file]);

  const loadTextContent = useCallback(async () => {
    if (!filePath) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5001/api/files/preview?path=${encodeURIComponent(filePath)}`);
      if (!response.ok) {
        throw new Error('无法读取文件内容');
      }
      const text = await response.text();
      setTextContent(text);
    } catch {
      setError('无法预览文本文件');
    }
    setLoading(false);
  }, [filePath]);

  const isVisible = isOpen !== undefined ? isOpen : !!file;
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <h2 className="text-lg font-bold text-white">文件预览</h2>
              <p className="text-white/80 text-sm truncate max-w-md">{currentFileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <span className="text-4xl animate-spin">🔄</span>
              <p className="text-gray-500 mt-4">加载中...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <span className="text-4xl">❌</span>
              <p className="text-gray-500 mt-4">{error}</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center justify-center h-80">
              <span className="text-6xl mb-4">📄</span>
              <p className="text-gray-500 text-center">
                文件预览
              </p>
              <a
                href={`/api/uploads/${file.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
              >
                🚀 在新标签页打开
              </a>
            </div>
          ) : previewType === 'image' && filePath ? (
            <div className="flex justify-center items-center">
              <img
                src={`http://localhost:5001/api/files/preview?path=${encodeURIComponent(filePath)}`}
                alt={currentFileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : previewType === 'text' && textContent ? (
            <div className="bg-gray-50 rounded-xl p-4 max-h-[60vh] overflow-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">{textContent}</pre>
            </div>
          ) : previewType === 'pdf' && filePath ? (
            <div className="flex flex-col items-center justify-center h-80">
              <span className="text-6xl mb-4">📄</span>
              <p className="text-gray-500 text-center">
                请在新标签页中打开 PDF 文件进行预览
              </p>
              <a
                href={`http://localhost:5001/api/files/preview?path=${encodeURIComponent(filePath)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
              >
                🚀 在新标签页打开
              </a>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-80">
              <span className="text-6xl mb-4">📁</span>
              <p className="text-gray-500 text-center">
                无法预览此类型的文件
              </p>
              {filePath && (
                <a
                  href={`http://localhost:5001/api/files/download?path=${encodeURIComponent(filePath)}`}
                  className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
                >
                  📥 下载文件
                </a>
              )}
            </div>
          )}
        </div>
        
        <div className="border-t border-gray-100 p-4 flex justify-end gap-3">
          {onDownload && (
            <button
              onClick={onDownload}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              📥 下载
            </button>
          )}
          {!onDownload && previewType !== 'other' && filePath && (
            <a
              href={`http://localhost:5001/api/files/download?path=${encodeURIComponent(filePath)}`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              📥 下载
            </a>
          )}
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition-all"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
