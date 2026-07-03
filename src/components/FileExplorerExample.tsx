import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/shadcn';
import FileExplorer, { FileItem } from '../components/FileExplorer';

const FileExplorerExample: React.FC = () => {
  const [files] = useState<FileItem[]>([
    {
      id: '1',
      name: '文档',
      type: 'folder',
      path: '/',
      size: 0,
      parent_id: null,
      is_folder: true,
      created_at: '2026-05-01T10:00:00Z',
      modified_at: '2026-05-31T10:00:00Z'
    },
    {
      id: '2',
      name: '图片',
      type: 'folder',
      path: '/',
      size: 0,
      parent_id: null,
      is_folder: true,
      created_at: '2026-05-01T10:00:00Z',
      modified_at: '2026-05-31T10:00:00Z'
    },
    {
      id: '3',
      name: '项目报告.pdf',
      type: 'document',
      path: '/',
      size: 2500000,
      mime_type: 'application/pdf',
      parent_id: null,
      is_folder: false,
      created_at: '2026-05-15T10:00:00Z',
      modified_at: '2026-05-30T15:30:00Z'
    },
    {
      id: '4',
      name: '头像.png',
      type: 'image',
      path: '/',
      size: 150000,
      mime_type: 'image/png',
      parent_id: null,
      is_folder: false,
      created_at: '2026-05-20T10:00:00Z',
      modified_at: '2026-05-20T10:00:00Z'
    },
    {
      id: '5',
      name: '备份.zip',
      type: 'archive',
      path: '/',
      size: 52000000,
      mime_type: 'application/zip',
      parent_id: null,
      is_folder: false,
      created_at: '2026-05-25T10:00:00Z',
      modified_at: '2026-05-25T10:00:00Z'
    },
    {
      id: '6',
      name: '会议记录.docx',
      type: 'document',
      path: '/',
      size: 45000,
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      parent_id: null,
      is_folder: false,
      created_at: '2026-05-28T10:00:00Z',
      modified_at: '2026-05-28T10:00:00Z'
    },
    {
      id: '7',
      name: '演示视频.mp4',
      type: 'video',
      path: '/',
      size: 150000000,
      mime_type: 'video/mp4',
      parent_id: null,
      is_folder: false,
      created_at: '2026-05-29T10:00:00Z',
      modified_at: '2026-05-29T10:00:00Z'
    },
    {
      id: '8',
      name: '背景音乐.mp3',
      type: 'audio',
      path: '/',
      size: 8500000,
      mime_type: 'audio/mpeg',
      parent_id: null,
      is_folder: false,
      created_at: '2026-05-30T10:00:00Z',
      modified_at: '2026-05-30T10:00:00Z'
    }
  ]);

  const handleFileSelect = (file: FileItem) => {
    console.log('选中文件:', file);
  };

  const handleFileOpen = (file: FileItem) => {
    console.log('打开文件:', file);
    alert(`打开文件: ${file.name}`);
  };

  const handleFileDelete = (file: FileItem) => {
    console.log('删除文件:', file);
    alert(`删除文件: ${file.name}`);
  };

  const handleFileRename = (file: FileItem, newName: string) => {
    console.log(`重命名文件 ${file.name} -> ${newName}`);
    alert(`文件已重命名为: ${newName}`);
  };

  const handleFolderCreate = (parentId: string | null, name: string) => {
    console.log(`创建文件夹: ${name}, 父目录: ${parentId}`);
    alert(`文件夹 "${name}" 创建成功`);
  };

  const handleFolderDelete = (folder: FileItem) => {
    console.log('删除文件夹:', folder);
    alert(`删除文件夹: ${folder.name}`);
  };

  const handleFolderRename = (folder: FileItem, newName: string) => {
    console.log(`重命名文件夹 ${folder.name} -> ${newName}`);
    alert(`文件夹已重命名为: ${newName}`);
  };

  const handleBatchDelete = (files: FileItem[]) => {
    console.log('批量删除文件:', files);
    alert(`删除 ${files.length} 个项目`);
  };

  const handleBatchMove = (files: FileItem[], targetFolderId: string) => {
    console.log(`移动 ${files.length} 个文件到:`, targetFolderId);
    alert(`移动 ${files.length} 个文件`);
  };

  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          📂 FileExplorer 组件演示
        </h1>
        
        <FileExplorer
          files={files}
          currentPath="/"
          onFileSelect={handleFileSelect}
          onFileOpen={handleFileOpen}
          onFileDelete={handleFileDelete}
          onFileRename={handleFileRename}
          onFolderCreate={handleFolderCreate}
          onFolderDelete={handleFolderDelete}
          onFolderRename={handleFolderRename}
          onBatchDelete={handleBatchDelete}
          onBatchMove={handleBatchMove}
          viewMode="list"
          selectable={true}
          showHidden={false}
          compact={false}
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">📖 使用说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-gray-700">
            <p className="mb-3 font-semibold">功能特性：</p>
            <ul className="mb-4 pl-5 list-disc">
              <li>📋 列表和网格两种视图模式自由切换</li>
              <li>📁 支持文件夹导航和面包屑路径</li>
              <li>🖱️ 单击选择，双击打开文件或进入文件夹</li>
              <li>⌨️ Ctrl/Command + 单击多选</li>
              <li>⇧ Shift + 单击连续选择</li>
              <li>📝 右键菜单（重命名、删除、移动）</li>
              <li>📁 新建文件夹功能</li>
              <li>🗑️ 批量删除文件</li>
              <li>🔄 实时显示文件大小和修改时间</li>
            </ul>

            <p className="mb-3 font-semibold">快捷键：</p>
            <ul className="pl-5 list-disc">
              <li><kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl/Cmd</kbd> + <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">点击</kbd> - 多选文件</li>
              <li><kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Shift</kbd> + <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">点击</kbd> - 连续选择</li>
              <li><kbd className="px-2 py-1 bg-gray-200 rounded text-xs">右键</kbd> - 打开上下文菜单</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FileExplorerExample;