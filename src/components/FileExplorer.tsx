import React, { useState, useEffect, useMemo, useCallback } from 'react';

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
    <div style={styles.gridContainer}>
      {filteredFiles.map(file => (
        <div
          key={file.id}
          style={{
            ...styles.gridItem,
            ...(selectedFiles.has(file.id) ? styles.gridItemSelected : {}),
            ...(compact ? styles.gridItemCompact : {})
          }}
          onClick={(e) => handleFileClick(file, e)}
          onDoubleClick={() => handleFileDoubleClick(file)}
          onContextMenu={(e) => handleContextMenu(e, file)}
        >
          {editingFile === file.id ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyPress={(e) => e.key === 'Enter' && handleRenameSubmit()}
              autoFocus
              style={styles.editInput}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <>
              <div style={styles.gridIcon}>{getFileIcon(file)}</div>
              <div style={styles.gridName}>{file.name}</div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div style={styles.listContainer}>
      <div style={styles.listHeader}>
        <div style={styles.listHeaderCell}>名称</div>
        <div style={styles.listHeaderCell}>大小</div>
        <div style={styles.listHeaderCell}>修改日期</div>
        <div style={styles.listHeaderCell}>类型</div>
      </div>
      <div style={styles.listBody}>
        {filteredFiles.map(file => (
          <div
            key={file.id}
            style={{
              ...styles.listRow,
              ...(selectedFiles.has(file.id) ? styles.listRowSelected : {}),
              ...(compact ? styles.listRowCompact : {})
            }}
            onClick={(e) => handleFileClick(file, e)}
            onDoubleClick={() => handleFileDoubleClick(file)}
            onContextMenu={(e) => handleContextMenu(e, file)}
          >
            <div style={styles.listCell}>
              <span style={styles.listIcon}>{getFileIcon(file)}</span>
              {editingFile === file.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyPress={(e) => e.key === 'Enter' && handleRenameSubmit()}
                  autoFocus
                  style={styles.editInput}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span style={styles.fileName}>{file.name}</span>
              )}
            </div>
            <div style={styles.listCell}>
              {file.is_folder ? '-' : formatSize(file.size)}
            </div>
            <div style={styles.listCell}>
              {formatDate(file.modified_at)}
            </div>
            <div style={styles.listCell}>
              {file.is_folder ? '文件夹' : file.mime_type || '文件'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.breadcrumb}>
          {breadcrumb.map((crumb, index) => (
            <span key={crumb.path}>
              {index > 0 && <span style={styles.breadcrumbSeparator}>/</span>}
              <button
                style={styles.breadcrumbItem}
                onClick={() => setCurrentDirectory(crumb.path)}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div style={styles.toolbarActions}>
          <button
            style={styles.toolbarButton}
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? '列表视图' : '网格视图'}
          >
            {viewMode === 'grid' ? '📋' : '⊞'}
          </button>
          
          {currentDirectory === '/' && (
            <button
              style={styles.toolbarButton}
              onClick={() => setShowNewFolder(true)}
              title="新建文件夹"
            >
              📁+
            </button>
          )}

          <button
            style={styles.toolbarButton}
            onClick={() => setCurrentDirectory('/')}
            title="刷新"
          >
            🔄
          </button>
        </div>
      </div>

      {showNewFolder && (
        <div style={styles.newFolderBar}>
          <input
            type="text"
            placeholder="文件夹名称"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
            style={styles.newFolderInput}
          />
          <button
            style={styles.newFolderButton}
            onClick={handleCreateFolder}
          >
            ✓ 创建
          </button>
          <button
            style={styles.cancelButton}
            onClick={() => {
              setShowNewFolder(false);
              setNewFolderName('');
            }}
          >
            ✕
          </button>
        </div>
      )}

      {selectedFiles.size > 0 && (
        <div style={styles.selectionBar}>
          <span style={styles.selectionText}>
            已选择 {selectedFiles.size} 个项目
          </span>
          <div style={styles.selectionActions}>
            <button
              style={styles.selectionButton}
              onClick={() => {
                onBatchMove?.(selectedFilesList, '');
                setSelectedFiles(new Set());
              }}
            >
              📤 移动
            </button>
            <button
              style={styles.selectionButton}
              onClick={handleBatchDelete}
            >
              🗑️ 删除
            </button>
            <button
              style={styles.selectionButton}
              onClick={() => setSelectedFiles(new Set())}
            >
              ✕ 取消
            </button>
          </div>
        </div>
      )}

      <div style={styles.content}>
        {filteredFiles.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <p>此文件夹为空</p>
          </div>
        ) : viewMode === 'grid' ? renderGridView() : renderListView()}
      </div>

      {contextMenu && (
        <div
          style={{
            ...styles.contextMenu,
            left: contextMenu.x,
            top: contextMenu.y
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.file && (
            <>
              {!contextMenu.file.is_folder && (
                <button
                  style={styles.contextMenuItem}
                  onClick={() => {
                    onFileOpen?.(contextMenu.file!);
                    setContextMenu(null);
                  }}
                >
                  📂 打开
                </button>
              )}
              <button
                style={styles.contextMenuItem}
                onClick={() => handleRename(contextMenu.file!)}
              >
                    ✏️ 重命名
              </button>
              {!contextMenu.file.is_folder && (
                <button
                  style={styles.contextMenuItem}
                  onClick={() => {
                    onFileMove?.(contextMenu.file!, '');
                    setContextMenu(null);
                  }}
                >
                  📤 移动
                </button>
              )}
              <button
                style={styles.contextMenuItem}
                onClick={() => {
                  if (contextMenu.file!.is_folder) {
                    onFolderDelete?.(contextMenu.file!);
                  } else {
                    onFileDelete?.(contextMenu.file!);
                  }
                  setContextMenu(null);
                }}
              >
                🗑️ 删除
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
  },
  breadcrumbSeparator: {
    color: '#9ca3af',
    margin: '0 4px',
  },
  breadcrumbItem: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  toolbarActions: {
    display: 'flex',
    gap: '8px',
  },
  toolbarButton: {
    width: '36px',
    height: '36px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newFolderBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    borderBottom: '1px solid #dbeafe',
  },
  newFolderInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    fontSize: '14px',
  },
  newFolderButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  cancelButton: {
    padding: '8px 12px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  selectionBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
  },
  selectionText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  selectionActions: {
    display: 'flex',
    gap: '8px',
  },
  selectionButton: {
    padding: '6px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  content: {
    minHeight: '400px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '16px',
    padding: '16px',
  },
  gridItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  gridItemSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  gridItemCompact: {
    padding: '12px 8px',
  },
  gridIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },
  gridName: {
    fontSize: '13px',
    color: '#1a1a2e',
    textAlign: 'center',
    wordBreak: 'break-all',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  listContainer: {
    width: '100%',
  },
  listHeader: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    fontWeight: '600',
    color: '#6b7280',
  },
  listHeaderCell: {
    padding: '0 8px',
  },
  listBody: {
    maxHeight: '500px',
    overflowY: 'auto',
  },
  listRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr',
    padding: '12px 16px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    fontSize: '14px',
    alignItems: 'center',
  },
  listRowSelected: {
    backgroundColor: '#eff6ff',
  },
  listRowCompact: {
    padding: '8px 16px',
  },
  listCell: {
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  listIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  fileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#1a1a2e',
  },
  editInput: {
    padding: '4px 8px',
    border: '1px solid #3b82f6',
    borderRadius: '4px',
    fontSize: '14px',
    width: '100%',
  },
  contextMenu: {
    position: 'fixed',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    padding: '8px 0',
    minWidth: '160px',
    zIndex: 1000,
  },
  contextMenuItem: {
    display: 'block',
    width: '100%',
    padding: '10px 16px',
    background: 'none',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
  },
};

export default FileExplorer;
