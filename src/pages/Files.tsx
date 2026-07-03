import React, { useState, useCallback, useEffect } from 'react';
import FileExplorer, { FileItem } from '../components/FileExplorer';
import FilePreview from '../components/FilePreview';
import { apiClient } from '../services/ApiClient';
import { useToast } from '../components/Toast';

interface PreviewFile {
  id: number;
  original_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  created_at: string;
}

interface ApiFile {
  id: number;
  filename: string;
  path: string;
  size: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  parent_id: number | null;
}

const Files: React.FC = () => {
  const { showToast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isDeleting, setIsDeleting] = useState(false);

  const getFileType = (filename: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other' => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other'> = {
      jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image',
      mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
      mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio',
      pdf: 'document', doc: 'document', docx: 'document', xls: 'document', xlsx: 'document', ppt: 'document', pptx: 'document', txt: 'document',
      zip: 'archive', rar: 'archive', tar: 'archive', gz: 'archive', ['7z']: 'archive',
    };
    return typeMap[ext] || 'other';
  };

  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
      mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska', webm: 'video/webm',
      mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg',
      pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      zip: 'application/zip', rar: 'application/x-rar-compressed', tar: 'application/x-tar', gz: 'application/gzip',
    };
    return mimeMap[ext] || 'application/octet-stream';
  };

  const convertApiFileToFileItem = (apiFile: ApiFile): FileItem => ({
    id: String(apiFile.id),
    name: apiFile.filename,
    type: getFileType(apiFile.filename),
    path: apiFile.path,
    size: apiFile.size,
    mime_type: getMimeType(apiFile.filename),
    is_folder: false,
    parent_id: apiFile.parent_id ? String(apiFile.parent_id) : null,
    created_at: apiFile.created_at,
    modified_at: apiFile.completed_at || apiFile.created_at,
  });

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ data: ApiFile[]; total: number }>('/files');
      if (response.success && response.data) {
        const fileItems = response.data.data.map(convertApiFileToFileItem);
        setFiles(fileItems);
      }
    } catch {
      showToast('获取文件列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  const handleFileSelect = useCallback((_file: FileItem) => {}, []);

  const handleFileOpen = useCallback((file: FileItem) => {
    if (!file.is_folder) {
      setPreviewFile({
        id: parseInt(file.id),
        original_name: file.name,
        file_size: file.size,
        mime_type: file.mime_type || getMimeType(file.name),
        file_path: file.path,
        created_at: file.created_at,
      });
    }
  }, []);

  const handleFileDelete = useCallback(async (file: FileItem) => {
    if (isDeleting) return;
    if (!window.confirm(`确定要删除 "${file.name}" 吗？`)) return;

    setIsDeleting(true);
    try {
      const response = await apiClient.delete<void>(`/files/${file.id}`);
      if (response.success) {
        setFiles(prev => prev.filter(f => f.id !== file.id));
        showToast(`"${file.name}" 已删除`, 'success');
      } else {
        showToast(response.message || '删除失败', 'error');
      }
    } catch {
      showToast('删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, showToast]);

  const handleFileRename = useCallback(async (file: FileItem, newName: string) => {
    if (!newName.trim()) {
      showToast('文件名不能为空', 'warning');
      return;
    }

    try {
      const response = await apiClient.put<{ data: { id: number; original_filename: string; file_path: string } }>(
        `/files/${file.id}`,
        { newName }
      );
      if (response.success) {
        setFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, name: newName, modified_at: new Date().toISOString() }
            : f
        ));
        showToast(`"${file.name}" 已重命名为 "${newName}"`, 'success');
      } else {
        showToast(response.message || '重命名失败', 'error');
      }
    } catch {
      showToast('重命名失败', 'error');
    }
  }, [showToast]);

  const handleFileMove = useCallback(async (file: FileItem, targetFolderId: string) => {
    try {
      const response = await apiClient.post<{ data: { id: number; file_path: string } }>(
        '/files/move',
        { id: parseInt(file.id), targetFolderId: parseInt(targetFolderId) }
      );
      if (response.success) {
        setFiles(prev => prev.map(f => {
          if (f.id === file.id) {
            const targetFolder = prev.find(p => p.id === targetFolderId);
            const newPath = targetFolder ? `${targetFolder.path}${targetFolder.name}/` : '/';
            return {
              ...f,
              parent_id: targetFolderId,
              path: newPath,
              modified_at: new Date().toISOString(),
            };
          }
          return f;
        }));
        showToast(`"${file.name}" 已移动`, 'success');
      } else {
        showToast(response.message || '移动失败', 'error');
      }
    } catch {
      showToast('移动失败', 'error');
    }
  }, [showToast]);

  const handleFolderCreate = useCallback(async (parentId: string | null, name: string) => {
    if (!name.trim()) {
      showToast('文件夹名称不能为空', 'warning');
      return;
    }

    try {
      const response = await apiClient.post<{ name: string; path: string; parentId: string | null; createdAt: string }>(
        '/files/folder',
        { name, parentId: parentId ? parseInt(parentId) : null }
      );
      if (response.success) {
        const newFolder: FileItem = {
          id: Date.now().toString(),
          name,
          type: 'folder',
          path: '/',
          size: 0,
          is_folder: true,
          parent_id: parentId,
          created_at: response.data?.createdAt || new Date().toISOString(),
          modified_at: new Date().toISOString(),
        };
        setFiles(prev => [...prev, newFolder]);
        showToast(`文件夹 "${name}" 已创建`, 'success');
      } else {
        showToast(response.message || '创建失败', 'error');
      }
    } catch {
      showToast('创建文件夹失败', 'error');
    }
  }, [showToast]);

  const handleFolderDelete = useCallback(async (folder: FileItem) => {
    if (isDeleting) return;
    if (!window.confirm(`确定要删除文件夹 "${folder.name}" 及其所有内容吗？`)) return;

    setIsDeleting(true);
    try {
      const response = await apiClient.delete<void>(`/files/${folder.id}`);
      if (response.success) {
        setFiles(prev => prev.filter(f => !f.path.startsWith(folder.path)));
        showToast(`文件夹 "${folder.name}" 已删除`, 'success');
      } else {
        showToast(response.message || '删除失败', 'error');
      }
    } catch {
      showToast('删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, showToast]);

  const handleFolderRename = useCallback(async (folder: FileItem, newName: string) => {
    if (!newName.trim()) {
      showToast('文件夹名称不能为空', 'warning');
      return;
    }

    try {
      const response = await apiClient.put<{ data: { id: number; original_filename: string; file_path: string } }>(
        `/files/${folder.id}`,
        { newName }
      );
      if (response.success) {
        setFiles(prev => prev.map(f =>
          f.id === folder.id
            ? { ...f, name: newName, modified_at: new Date().toISOString() }
            : f
        ));
        showToast(`"${folder.name}" 已重命名为 "${newName}"`, 'success');
      } else {
        showToast(response.message || '重命名失败', 'error');
      }
    } catch {
      showToast('重命名失败', 'error');
    }
  }, [showToast]);

  const handleBatchDelete = useCallback(async (filesToDelete: FileItem[]) => {
    if (isDeleting) return;
    if (!window.confirm(`确定要删除 ${filesToDelete.length} 个项目吗？`)) return;

    setIsDeleting(true);
    try {
      const ids = filesToDelete.map(f => parseInt(f.id));
      const response = await apiClient.post<void>('/files/batch-delete', { ids });
      if (response.success) {
        const idsToDelete = new Set(filesToDelete.map(f => f.id));
        setFiles(prev => prev.filter(f => !idsToDelete.has(f.id)));
        showToast(`已删除 ${filesToDelete.length} 个项目`, 'success');
      } else {
        showToast(response.message || '批量删除失败', 'error');
      }
    } catch {
      showToast('批量删除失败', 'error');
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, showToast]);

  const handleBatchMove = useCallback(async (filesToMove: FileItem[], targetFolderId: string) => {
    try {
      const ids = filesToMove.map(f => parseInt(f.id));
      const response = await apiClient.post<void>('/files/move', { ids, targetFolderId: parseInt(targetFolderId) });
      if (response.success) {
        const idsToMove = new Set(filesToMove.map(f => f.id));
        setFiles(prev => prev.map(f => {
          if (idsToMove.has(f.id)) {
            const targetFolder = prev.find(p => p.id === targetFolderId);
            const newPath = targetFolder ? `${targetFolder.path}${targetFolder.name}/` : '/';
            return {
              ...f,
              parent_id: targetFolderId,
              path: newPath,
              modified_at: new Date().toISOString(),
            };
          }
          return f;
        }));
        showToast(`已移动 ${filesToMove.length} 个项目`, 'success');
      } else {
        showToast(response.message || '批量移动失败', 'error');
      }
    } catch {
      showToast('批量移动失败', 'error');
    }
  }, [showToast]);

  const handleClosePreview = () => {
    setPreviewFile(null);
  };

  const handleDownload = () => {
    if (previewFile) {
      window.open(`/api/uploads/${previewFile.id}/download`, '_blank');
    }
  };

  return (
    <div className="files-page">
      <div className="page-header">
        <h2 className="page-title">📁 文件管理</h2>
        <p className="page-desc">浏览、管理和预览您的文件</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
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
      )}

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
