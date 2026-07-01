import React, { useState, useCallback } from 'react';
import FileExplorer, { FileItem } from '../components/FileExplorer';
import FilePreview from '../components/FilePreview';

const Files: React.FC = () => {
  // 示例文件数据
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: '视频文件夹',
      type: 'folder',
      path: '/',
      size: 0,
      is_folder: true,
      parent_id: null,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: '文档',
      type: 'folder',
      path: '/',
      size: 0,
      is_folder: true,
      parent_id: null,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: '照片.jpg',
      type: 'image',
      path: '/',
      size: 2048000,
      mime_type: 'image/jpeg',
      is_folder: false,
      parent_id: null,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: '音乐.mp3',
      type: 'audio',
      path: '/',
      size: 5120000,
      mime_type: 'audio/mpeg',
      is_folder: false,
      parent_id: null,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
    {
      id: '5',
      name: '项目文档.pdf',
      type: 'document',
      path: '/',
      size: 1024000,
      mime_type: 'application/pdf',
      is_folder: false,
      parent_id: null,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
    {
      id: '6',
      name: '视频.mp4',
      type: 'video',
      path: '/',
      size: 104857600,
      mime_type: 'video/mp4',
      is_folder: false,
      parent_id: null,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    },
  ]);

  // 预览状态
  const [previewFile, setPreviewFile] = useState<any>(null);

  // 视图模式
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // 文件选择回调
  const handleFileSelect = useCallback((file: FileItem) => {
    console.log('Selected file:', file);
  }, []);

  // 文件打开回调（预览）
  const handleFileOpen = useCallback((file: FileItem) => {
    if (!file.is_folder) {
      setPreviewFile({
        id: parseInt(file.id),
        original_name: file.name,
        file_size: file.size,
        mime_type: file.mime_type || getMimeTypeFromType(file.type),
        file_path: file.path,
        created_at: file.created_at,
      });
    }
  }, []);

  // 文件删除
  const handleFileDelete = useCallback((file: FileItem) => {
    if (window.confirm(`确定要删除 "${file.name}" 吗？`)) {
      setFiles(files.filter(f => f.id !== file.id));
    }
  }, [files]);

  // 文件重命名
  const handleFileRename = useCallback((file: FileItem, newName: string) => {
    setFiles(files.map(f =>
      f.id === file.id
        ? { ...f, name: newName, modified_at: new Date().toISOString() }
        : f
    ));
  }, [files]);

  // 文件移动
  const handleFileMove = useCallback((file: FileItem, targetFolderId: string) => {
    console.log(`Moving ${file.name} to ${targetFolderId}`);
    // 实现文件移动逻辑
  }, []);

  // 创建文件夹
  const handleFolderCreate = useCallback((parentId: string | null, name: string) => {
    const newFolder: FileItem = {
      id: Date.now().toString(),
      name,
      type: 'folder',
      path: '/',
      size: 0,
      is_folder: true,
      parent_id: parentId,
      created_at: new Date().toISOString(),
      modified_at: new Date().toISOString(),
    };
    setFiles([...files, newFolder]);
  }, [files]);

  // 删除文件夹
  const handleFolderDelete = useCallback((folder: FileItem) => {
    if (window.confirm(`确定要删除文件夹 "${folder.name}" 及其所有内容吗？`)) {
      setFiles(files.filter(f => !f.path.startsWith(folder.path)));
    }
  }, [files]);

  // 重命名文件夹
  const handleFolderRename = useCallback((folder: FileItem, newName: string) => {
    setFiles(files.map(f =>
      f.id === folder.id
        ? { ...f, name: newName, modified_at: new Date().toISOString() }
        : f
    ));
  }, [files]);

  // 批量删除
  const handleBatchDelete = useCallback((filesToDelete: FileItem[]) => {
    if (window.confirm(`确定要删除 ${filesToDelete.length} 个项目吗？`)) {
      const idsToDelete = new Set(filesToDelete.map(f => f.id));
      setFiles(files.filter(f => !idsToDelete.has(f.id)));
    }
  }, [files]);

  // 批量移动
  const handleBatchMove = useCallback((filesToMove: FileItem[], targetFolderId: string) => {
    console.log(`Moving ${filesToMove.length} files to ${targetFolderId}`);
    // 实现批量移动逻辑
  }, []);

  // 获取文件类型对应的 MIME 类型
  const getMimeTypeFromType = (type: string): string => {
    const mimeTypes: Record<string, string> = {
      image: 'image/jpeg',
      video: 'video/mp4',
      audio: 'audio/mpeg',
      document: 'application/pdf',
      archive: 'application/zip',
      other: 'application/octet-stream',
    };
    return mimeTypes[type] || mimeTypes.other;
  };

  // 关闭预览
  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  // 下载文件
  const handleDownload = () => {
    if (previewFile) {
      window.open(`/api/uploads/${previewFile.id}/download`, '_blank');
    }
  };

  return (
    <div className="files-page">
      {/* 页面头部 */}
      <div className="page-header">
        <h2 className="page-title">📁 文件管理</h2>
        <p className="page-desc">浏览、管理和预览您的文件</p>
      </div>

      {/* 文件浏览器 */}
      <FileExplorer
        files={files}
        onFileSelect={handleFileSelect}
        onFileOpen={handleFileOpen}
        onFileDelete={handleFileDelete}
        onFileRename={handleFileRename}
        onFileMove={handleFileMove}
        onFolderCreate={handleFolderCreate}
        onFolderDelete={handleFolderDelete}
        onFolderRename={handleFolderRename}
        onBatchDelete={handleBatchDelete}
        onBatchMove={handleBatchMove}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectable={true}
        showHidden={false}
      />

      {/* 文件预览 */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={handleClosePreview}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
};

export default Files;
