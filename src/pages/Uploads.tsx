import React, { useRef, useState, useMemo, useCallback } from 'react';
import { useUploadManager } from '../hooks/useUploadManager';
import { UploadItem } from '../components/UploadItem';
import { StatsPanel } from '../components/StatsPanel';
import { Pagination } from '../components/ui';

const Uploads: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const {
    uploads,
    stats,
    addUpload,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    removeUpload,
    clearCompleted,
    startAllUploads,
  } = useUploadManager();

  const paginatedUploads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return uploads.slice(start, end);
  }, [uploads, currentPage, pageSize]);

  const totalPages = Math.ceil(uploads.length / pageSize);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addUpload(e.target.files);
      e.target.value = '';
    }
  }, [addUpload]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => Math.max(0, prev - 1));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files).filter(file => file.type !== '');
      if (fileArray.length > 0) {
        addUpload(fileArray);
      }
    }
  }, [addUpload]);

  const handleClearCompleted = useCallback(() => {
    clearCompleted();
  }, [clearCompleted]);

  const handleStartAll = useCallback(() => {
    void startAllUploads();
  }, [startAllUploads]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">📤 上传管理</h2>
          <p className="text-gray-500 mt-1">上传文件到服务器，支持多文件和拖拽上传</p>
        </div>

        <div
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden ${
            isDragging || dragCounter > 0
              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-200'
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-100'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClickUpload}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className={`flex flex-col items-center justify-center py-12 px-6 transition-all duration-300 ${
            isDragging ? 'scale-105' : ''
          }`}>
            <div className={`text-6xl mb-4 transition-transform duration-300 ${
              isDragging ? 'animate-bounce' : ''
            }`}>
              {isDragging ? '📥' : '📁'}
            </div>
            
            <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
              isDragging ? 'text-blue-600' : 'text-gray-700'
            }`}>
              {isDragging ? '松开鼠标以上传文件' : '点击或拖拽文件到这里'}
            </h3>
            
            <p className="text-gray-500 text-sm">
              {isDragging ? '支持多文件同时上传' : '支持多文件上传，最大文件大小不限'}
            </p>

            {isDragging && (
              <div className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-600 text-sm font-medium">拖放区域已激活</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-purple-500 transform scale-x-0 transition-transform duration-300 origin-left"
               style={{ transform: isDragging ? 'scaleX(1)' : 'scaleX(0)' }}>
          </div>
        </div>

        <StatsPanel stats={stats} title="上传统计" icon="📈" />

        <div className="flex gap-3 mt-6">
          {uploads.length > 0 && (
            <>
              <button
                onClick={handleStartAll}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <span>▶</span>
                <span>全部开始</span>
              </button>
              <button
                onClick={handleClearCompleted}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <span>🗑</span>
                <span>清空已完成</span>
              </button>
            </>
          )}
        </div>

        <div className="mt-6">
          {uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
              <span className="text-6xl mb-4">📤</span>
              <p className="text-gray-500 mb-2">暂无上传任务</p>
              <p className="text-gray-400 text-sm">点击上方区域或拖拽文件开始上传</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedUploads.map((item) => (
                <UploadItem
                  key={item.id}
                  item={item}
                  onStart={(id) => void startUpload(id)}
                  onPause={pauseUpload}
                  onResume={(id) => void resumeUpload(id)}
                  onCancel={cancelUpload}
                  onRemove={removeUpload}
                />
              ))}
            </div>
          )}
        </div>

        {uploads.length > 0 && totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              current={currentPage}
              total={uploads.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              showTotal={(total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Uploads;