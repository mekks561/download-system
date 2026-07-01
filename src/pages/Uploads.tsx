import React, { useRef, useState, useMemo } from 'react';
import { useUploadManager } from '../hooks/useUploadManager';
import { UploadItem } from '../components/UploadItem';
import { StatsPanel } from '../components/StatsPanel';
import { Pagination } from '../components/ui';

const Uploads: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addUpload(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addUpload(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleClearCompleted = () => {
    clearCompleted();
  };

  const handleStartAll = () => {
    startAllUploads();
  };

  return (
    <div className="uploads-page">
      <div className="page-header">
        <h2 className="page-title">📤 上传管理</h2>
        <p className="page-desc">上传文件到服务器，支持多文件和拖拽上传</p>
      </div>

      <div
        className="upload-drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="file-input"
          onChange={handleFileSelect}
        />
        <span className="drop-icon">📁</span>
        <p>点击或拖拽文件到这里上传</p>
        <p className="drop-hint">支持多文件上传</p>
      </div>

      <StatsPanel stats={stats} title="上传统计" icon="📈" />

      <div className="action-bar">
        {uploads.length > 0 && (
          <>
            <button className="action-bar-btn" onClick={handleStartAll}>
              ▶ 全部开始
            </button>
            <button className="action-bar-btn" onClick={handleClearCompleted}>
              🗑 清空已完成
            </button>
          </>
        )}
      </div>

      <div className="upload-list">
        {uploads.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📤</span>
            <p>暂无上传任务</p>
            <p className="empty-hint">点击上方区域或拖拽文件开始上传</p>
          </div>
        ) : (
          paginatedUploads.map((item) => (
            <UploadItem
              key={item.id}
              item={item}
              onStart={startUpload}
              onPause={pauseUpload}
              onResume={resumeUpload}
              onCancel={cancelUpload}
              onRemove={removeUpload}
            />
          ))
        )}
      </div>

      {/* 分页 */}
      {uploads.length > 0 && totalPages > 1 && (
        <div className="pagination-container">
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
  );
};

export default Uploads;