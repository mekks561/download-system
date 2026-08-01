import React, { useState, useCallback } from 'react';
import { ExportImportService } from '../services/ExportImportService';

interface ExportImportProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

const ExportImport: React.FC<ExportImportProps> = ({ isOpen, onClose, onDataChanged }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleExportJSON = useCallback(async () => {
    setLoading(true);
    try {
      await ExportImportService.exportDownloads();
      setStatus('success');
      setMessage('✅ JSON导出成功！');
    } catch {
      setStatus('error');
      setMessage('❌ 导出失败，请重试');
    }
    setLoading(false);
    setTimeout(() => setStatus('idle'), 3000);
  }, []);

  const handleExportCSV = useCallback(async () => {
    setLoading(true);
    try {
      await ExportImportService.exportDownloadsCSV();
      setStatus('success');
      setMessage('✅ CSV导出成功！');
    } catch {
      setStatus('error');
      setMessage('❌ 导出失败，请重试');
    }
    setLoading(false);
    setTimeout(() => setStatus('idle'), 3000);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = ExportImportService.validateImportFile(selectedFile);
      if (validationError) {
        setStatus('error');
        setMessage(validationError);
        setTimeout(() => setStatus('idle'), 3000);
        return;
      }
      setFile(selectedFile);
      setStatus('idle');
      setMessage('');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!file) return;
    
    setLoading(true);
    try {
      const response = await ExportImportService.importData(file);
      if (response.success) {
        setStatus('success');
        setMessage('✅ 导入成功！');
        onDataChanged?.();
      } else {
        setStatus('error');
        setMessage(response.message || '导入失败');
      }
    } catch (err) {
      const error = err as Error;
      setStatus('error');
      setMessage(error.message || '导入失败');
    }
    setLoading(false);
    setFile(null);
    setTimeout(() => setStatus('idle'), 3000);
  }, [file, onDataChanged]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden kawaii-shadow">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📤</span>
            <div>
              <h2 className="text-xl font-bold text-white">数据导出/导入</h2>
              <p className="text-white/80 text-sm">管理您的下载数据</p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📥 导出数据</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => void handleExportJSON()}
                  disabled={loading}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border-2 border-pink-200 hover:border-pink-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">📋</span>
                  <span className="text-sm font-medium text-gray-700">JSON</span>
                  <span className="text-xs text-gray-500">完整数据</span>
                </button>
                <button
                  onClick={() => void handleExportCSV()}
                  disabled={loading}
                  className="flex flex-col items-center gap-2 p-4 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">📊</span>
                  <span className="text-sm font-medium text-gray-700">CSV</span>
                  <span className="text-xs text-gray-500">下载列表</span>
                </button>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span>📤 导入数据</span>
              </h3>
              
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-3xl mb-2">{file ? '✓' : '📁'}</span>
                  <p className="text-sm text-gray-600">
                    {file ? `已选择: ${file.name}` : '点击或拖拽文件到此处'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">支持 JSON 格式，最大 10MB</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".json"
                  onChange={handleFileChange}
                />
              </label>
              
              {file && (
                <button
                  onClick={() => void handleImport()}
                  disabled={loading}
                  className="w-full mt-3 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner">🔄</span>
                      <span>导入中...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>开始导入</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {status !== 'idle' && (
              <div className={`p-3 rounded-lg text-center text-sm ${
                status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}
          </div>
          
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportImport;
