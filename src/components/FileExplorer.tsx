import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from './ui/shadcn/Button';
import { Input } from './ui/shadcn/Input';
import { ScrollArea } from './ui/shadcn/ScrollArea';
import { Card } from './ui/shadcn/Card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/shadcn/Tooltip';

export type FileType = 'folder' | 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  path: string;
  size: number;
  mime_type?: string;
  parent_id: string | null;
  is_folder: boolean;
  created_at: string;
  modified_at: string;
  children?: FileItem[];
}

export interface FileExplorerProps {
  files: FileItem[];
  currentPath?: string;
  onFileSelect?: (file: FileItem) => void;
  onFileOpen?: (file: FileItem) => void;
  onFileDelete?: (file: FileItem) => void;
  onFileRename?: (file: FileItem, newName: string) => void;
  onFileMove?: (file: FileItem, targetFolderId: string) => void;
  onFolderCreate?: (parentId: string | null, name: string) => void;
  onFolderDelete?: (folder: FileItem) => void;
  onFolderRename?: (folder: FileItem, newName: string) => void;
  onBatchDelete?: (files: FileItem[]) => void;
  onBatchMove?: (files: FileItem[], targetFolderId: string) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  maxSelect?: number;
  selectable?: boolean;
  showHidden?: boolean;
  compact?: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  currentPath = '/',
  onFileSelect,
  onFileOpen,
  onFileDelete,
  onFileRename,
  onFileMove,
  onFolderCreate,
  onFolderDelete,
  onFolderRename,
  onBatchDelete,
  onBatchMove,
  viewMode: initialViewMode = 'list',
  onViewModeChange,
  maxSelect = 100,
  selectable = true,
  showHidden = false,
  compact = false
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [expandedFolders] = useState<Set<string>>(new Set());
  const [currentDirectory, setCurrentDirectory] = useState<string>(currentPath);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileItem | null } | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    if (onViewModeChange) {
      onViewModeChange(viewMode);
    }
  }, [viewMode, onViewModeChange]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const filteredFiles = useMemo(() => {
    let result = files.filter(f => f.path === currentDirectory);
    
    if (!showHidden) {
      result = result.filter(f => !f.name.startsWith('.'));
    }
    
    const folders = result.filter(f => f.is_folder).sort((a, b) => a.name.localeCompare(b.name));
    const regularFiles = result.filter(f => !f.is_folder).sort((a, b) => a.name.localeCompare(b.name));
    
    return [...folders, ...regularFiles];
  }, [files, currentDirectory, showHidden]);

  const breadcrumb = useMemo(() => {
    const parts = currentDirectory.split('/').filter(Boolean);
    const crumbs = [{ name: '首页', path: '/' }];
    let path = '';
    parts.forEach(part => {
      path += '/' + part;
      crumbs.push({ name: part, path });
    });
    return crumbs;
  }, [currentDirectory]);

  const handleFileClick = useCallback((file: FileItem, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (file.is_folder) {
      setCurrentDirectory(file.path + '/' + file.name);
      setSelectedFiles(new Set());
      return;
    }

    if (selectable) {
      if (event.ctrlKey || event.metaKey) {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(file.id)) {
          newSelected.delete(file.id);
        } else {
          if (newSelected.size < maxSelect) {
            newSelected.add(file.id);
          }
        }
        setSelectedFiles(newSelected);
      } else if (event.shiftKey && selectedFiles.size > 0) {
        const fileIndex = filteredFiles.findIndex(f => f.id === file.id);
        const selectedArray = Array.from(selectedFiles);
        const lastSelected = filteredFiles.find(f => f.id === selectedArray[selectedArray.length - 1]);
        const lastIndex = filteredFiles.findIndex(f => f.id === lastSelected?.id);
        
        const start = Math.min(fileIndex, lastIndex);
        const end = Math.max(fileIndex, lastIndex);
        
        const newSelected = new Set(selectedFiles);
        for (let i = start; i <= end; i++) {
          if (filteredFiles[i] && !filteredFiles[i].is_folder) {
            newSelected.add(filteredFiles[i].id);
          }
        }
        setSelectedFiles(newSelected);
      } else {
        setSelectedFiles(new Set([file.id]));
      }
    }

    onFileSelect?.(file);
  }, [selectable, selectedFiles, filteredFiles, maxSelect, onFileSelect]);

  const handleFileDoubleClick = useCallback((file: FileItem) => {
    if (file.is_folder) {
      setCurrentDirectory(file.path + '/' + file.name);
    } else {
      onFileOpen?.(file);
    }
  }, [onFileOpen]);

  const handleContextMenu = useCallback((event: React.MouseEvent, file: FileItem) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, file });
    
    if (selectable && !selectedFiles.has(file.id)) {
      setSelectedFiles(new Set([file.id]));
    }
  }, [selectable, selectedFiles]);

  const handleRename = useCallback((file: FileItem) => {
    setEditingFile(file.id);
    setEditName(file.name);
    setContextMenu(null);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (editingFile && editName.trim()) {
      const file = files.find(f => f.id === editingFile);
      if (file) {
        if (file.is_folder) {
          onFolderRename?.(file, editName.trim());
        } else {
          onFileRename?.(file, editName.trim());
        }
      }
    }
    setEditingFile(null);
    setEditName('');
  }, [editingFile, editName, files, onFileRename, onFolderRename]);

  const handleCreateFolder = useCallback(() => {
    if (newFolderName.trim() && currentDirectory === '/') {
      onFolderCreate?.(null, newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  }, [newFolderName, currentDirectory, onFolderCreate]);

  const getFileIcon = (file: FileItem): string => {
    if (file.is_folder) {
      const isExpanded = expandedFolders.has(file.id);
      return isExpanded ? '📂' : '📁';
    }
    
    switch (file.type) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'document': return '📄';
      case 'archive': return '📦';
      default: return '📁';
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBatchDelete = useCallback(() => {
    if (selectedFiles.size === 0) return;
    
    const filesToDelete = files.filter(f => selectedFiles.has(f.id));
    if (window.confirm(`确定要删除 ${filesToDelete.length} 个文件吗？`)) {
      onBatchDelete?.(filesToDelete);
      setSelectedFiles(new Set());
    }
  }, [selectedFiles, files, onBatchDelete]);

  const selectedFilesList = useMemo(() => {
    return files.filter(f => selectedFiles.has(f.id));
  }, [files, selectedFiles]);

  const renderGridView = () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-4 p-4">
      {filteredFiles.map(file => (
        <div
          key={file.id}
          className={`
            flex flex-col items-center rounded-lg cursor-pointer transition-all duration-200 border-2 border-transparent
            ${selectedFiles.has(file.id) ? 'bg-blue-50 border-primary-500' : ''}
            ${compact ? 'py-3 px-2' : 'py-4 px-2'}
          `}
          onClick={(e) => handleFileClick(file, e)}
          onDoubleClick={() => handleFileDoubleClick(file)}
          onContextMenu={(e) => handleContextMenu(e, file)}
        >
          {editingFile === file.id ? (
            <Input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
              autoFocus
              className="h-8 text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div className="text-5xl mb-2">{getFileIcon(file)}</div>
              <div className="text-sm text-gray-800 text-center break-all overflow-hidden line-clamp-2">
                {file.name}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="w-full">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-4 py-3 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-500">
        <div className="px-2">名称</div>
        <div className="px-2">大小</div>
        <div className="px-2">修改日期</div>
        <div className="px-2">类型</div>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {filteredFiles.map(file => (
          <div
            key={file.id}
            className={`
              grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-gray-100 cursor-pointer transition-colors duration-200 text-sm items-center
              ${selectedFiles.has(file.id) ? 'bg-blue-50' : ''}
              ${compact ? 'py-2 px-4' : 'py-3 px-4'}
            `}
            onClick={(e) => handleFileClick(file, e)}
            onDoubleClick={() => handleFileDoubleClick(file)}
            onContextMenu={(e) => handleContextMenu(e, file)}
          >
            <div className="px-2 flex items-center gap-2">
              <span className="text-xl flex-shrink-0">{getFileIcon(file)}</span>
              {editingFile === file.id ? (
                <Input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                  autoFocus
                  className="h-8 text-sm flex-1"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate text-gray-800">{file.name}</span>
              )}
            </div>
            <div className="px-2 text-gray-600">
              {file.is_folder ? '-' : formatSize(file.size)}
            </div>
            <div className="px-2 text-gray-600">
              {formatDate(file.modified_at)}
            </div>
            <div className="px-2 text-gray-600">
              {file.is_folder ? '文件夹' : file.mime_type || '文件'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Card className="w-full rounded-xl shadow-md overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-1 text-sm">
            {breadcrumb.map((crumb, index) => (
              <span key={crumb.path} className="flex items-center">
                {index > 0 && <span className="text-gray-400 mx-1">/</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-primary-500 hover:text-primary-600 hover:bg-primary-50"
                  onClick={() => setCurrentDirectory(crumb.path)}
                >
                  {crumb.name}
                </Button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                >
                  {viewMode === 'grid' ? '📋' : '⊞'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {viewMode === 'grid' ? '列表视图' : '网格视图'}
              </TooltipContent>
            </Tooltip>
            
            {currentDirectory === '/' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setShowNewFolder(true)}
                  >
                    📁+
                  </Button>
                </TooltipTrigger>
                <TooltipContent>新建文件夹</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setCurrentDirectory('/')}
                >
                  🔄
                </Button>
              </TooltipTrigger>
              <TooltipContent>刷新</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {showNewFolder && (
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-100">
            <Input
              type="text"
              placeholder="文件夹名称"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="flex-1 border-primary-500 focus-visible:ring-primary-500"
            />
            <Button onClick={handleCreateFolder}>
              ✓ 创建
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewFolder(false);
                setNewFolderName('');
              }}
            >
              ✕
            </Button>
          </div>
        )}

        {selectedFiles.size > 0 && (
          <div className="flex justify-between items-center px-4 py-3 bg-primary-500 text-white">
            <span className="text-sm font-medium">
              已选择 {selectedFiles.size} 个项目
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
                onClick={() => {
                  onBatchMove?.(selectedFilesList, '');
                  setSelectedFiles(new Set());
                }}
              >
                📤 移动
              </Button>
              <Button
                size="sm"
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
                onClick={handleBatchDelete}
              >
                🗑️ 删除
              </Button>
              <Button
                size="sm"
                className="bg-white/20 text-white border border-white/30 hover:bg-white/30"
                onClick={() => setSelectedFiles(new Set())}
              >
                ✕ 取消
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="min-h-[400px] max-h-[600px]">
          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
              <span className="text-6xl mb-4">📭</span>
              <p>此文件夹为空</p>
            </div>
          ) : viewMode === 'grid' ? renderGridView() : renderListView()}
        </ScrollArea>

        {contextMenu && (
          <div
            className="fixed bg-white rounded-lg shadow-lg py-2 min-w-[160px] z-[1000]"
            style={{
              left: contextMenu.x,
              top: contextMenu.y
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.file && (() => {
              const file = contextMenu.file;
              return (
                <>
                  {!file.is_folder && (
                    <button
                      className="block w-full px-4 py-2.5 bg-none border-none text-left cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        onFileOpen?.(file);
                        setContextMenu(null);
                      }}
                    >
                      📂 打开
                    </button>
                  )}
                  <button
                    className="block w-full px-4 py-2.5 bg-none border-none text-left cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => handleRename(file)}
                  >
                    ✏️ 重命名
                  </button>
                  {!file.is_folder && (
                    <button
                      className="block w-full px-4 py-2.5 bg-none border-none text-left cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        onFileMove?.(file, '');
                        setContextMenu(null);
                      }}
                    >
                      📤 移动
                    </button>
                  )}
                  <button
                    className="block w-full px-4 py-2.5 bg-none border-none text-left cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => {
                      if (file.is_folder) {
                        onFolderDelete?.(file);
                      } else {
                        onFileDelete?.(file);
                      }
                      setContextMenu(null);
                    }}
                  >
                    🗑️ 删除
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
};

export default FileExplorer;
