import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/shadcn';
import { ScrollArea } from './ui/shadcn';
import DragDropUploader from '../components/DragDropUploader';

interface LogItem {
  id: string;
  message: string;
}

const DragDropUploaderExample: React.FC = () => {
  const [uploadLog, setUploadLog] = useState<LogItem[]>([]);
  const logIdRef = useRef(0);

  const addLog = (message: string) => {
    logIdRef.current++;
    setUploadLog(prev => [...prev, { id: `log-${logIdRef.current}`, message }]);
  };

  const handleUpload = async (files: File[]) => {
    addLog(`开始上传 ${files.length} 个文件...`);
    
    for (const file of files) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog(`✅ 上传成功: ${file.name}`);
    }
    
    addLog(`🎉 全部上传完成！`);
  };

  const handleFileSelect = (files: File[]) => {
    addLog(`📁 已选择 ${files.length} 个文件`);
  };

  const customValidation = (file: File): string | null => {
    if (file.name.length > 100) {
      return '文件名过长（最多100个字符）';
    }
    
    const forbiddenNames = ['test', 'demo', 'temp'];
    if (forbiddenNames.some(name => file.name.toLowerCase().includes(name))) {
      return '文件名包含禁止词汇';
    }
    
    return null;
  };

  return (
    <div className="p-10 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          📤 DragDropUploader 组件演示
        </h1>

        <DragDropUploader
          onUpload={handleUpload}
          onFileSelect={handleFileSelect}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
          maxSize={50 * 1024 * 1024}
          maxFiles={5}
          multiple={true}
          showPreview={true}
          uploadImmediately={true}
          customValidation={customValidation}
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">📝 上传日志</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-50 bg-gray-50 rounded-lg p-4 font-mono text-sm leading-relaxed">
              {uploadLog.length === 0 ? (
                <div className="text-gray-400">暂无上传记录...</div>
              ) : (
                uploadLog.map((log) => (
                  <div key={log.id} className="mb-1">{log.message}</div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl">📖 使用说明</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-gray-700">
            <p className="mb-3 font-semibold">功能特性：</p>
            <ul className="mb-4 pl-5 list-disc">
              <li>🎨 拖拽上传 - 直接拖拽文件到上传区域</li>
              <li>📁 点击选择 - 点击区域打开文件选择器</li>
              <li>🖼️ 图片预览 - 支持图片文件缩略图预览</li>
              <li>✅ 文件验证 - 自动验证文件类型和大小</li>
              <li>📊 进度显示 - 实时显示上传进度</li>
              <li>🚫 自定义验证 - 支持自定义验证规则</li>
              <li>🗑️ 队列管理 - 支持清空已完成或全部文件</li>
            </ul>

            <p className="mb-3 font-semibold">配置选项：</p>
            <ul className="mb-4 pl-5 list-disc">
              <li><code className="px-1 bg-gray-100 rounded">accept</code> - 接受的文件类型</li>
              <li><code className="px-1 bg-gray-100 rounded">maxSize</code> - 单个文件最大大小（字节）</li>
              <li><code className="px-1 bg-gray-100 rounded">maxFiles</code> - 最多文件数量</li>
              <li><code className="px-1 bg-gray-100 rounded">multiple</code> - 是否允许多文件</li>
              <li><code className="px-1 bg-gray-100 rounded">showPreview</code> - 是否显示图片预览</li>
              <li><code className="px-1 bg-gray-100 rounded">uploadImmediately</code> - 选择后立即上传</li>
              <li><code className="px-1 bg-gray-100 rounded">customValidation</code> - 自定义验证函数</li>
            </ul>

            <p className="mb-3 font-semibold">支持的验证：</p>
            <ul className="pl-5 list-disc">
              <li>文件类型验证（通过 accept 属性）</li>
              <li>文件大小验证（通过 maxSize 属性）</li>
              <li>文件数量验证（通过 maxFiles 属性）</li>
              <li>自定义验证（通过 customValidation 函数）</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DragDropUploaderExample;