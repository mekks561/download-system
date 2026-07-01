import React, { useState } from 'react';
import DragDropUploader from '../components/DragDropUploader';

const DragDropUploaderExample: React.FC = () => {
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  const handleUpload = async (files: File[]) => {
    setUploadLog(prev => [...prev, `开始上传 ${files.length} 个文件...`]);
    
    for (const file of files) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUploadLog(prev => [...prev, `✅ 上传成功: ${file.name}`]);
    }
    
    setUploadLog(prev => [...prev, `🎉 全部上传完成！`]);
  };

  const handleFileSelect = (files: File[]) => {
    console.log('选择的文件:', files);
    setUploadLog(prev => [...prev, `📁 已选择 ${files.length} 个文件`]);
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
    <div style={{ padding: '40px', backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '32px', fontSize: '28px', fontWeight: '700', color: '#1a1a2e' }}>
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

        <div style={{ marginTop: '32px', padding: '24px', backgroundColor: 'white', borderRadius: '12px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1a1a2e' }}>
            📝 上传日志
          </h2>
          
          <div style={{ 
            height: '200px', 
            overflowY: 'auto', 
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.8'
          }}>
            {uploadLog.length === 0 ? (
              <div style={{ color: '#9ca3af' }}>暂无上传记录...</div>
            ) : (
              uploadLog.map((log, index) => (
                <div key={index} style={{ marginBottom: '4px' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ marginTop: '32px', padding: '24px', backgroundColor: 'white', borderRadius: '12px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#1a1a2e' }}>
            📖 使用说明
          </h2>
          
          <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#374151' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>功能特性：</strong>
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              <li>🎨 拖拽上传 - 直接拖拽文件到上传区域</li>
              <li>📁 点击选择 - 点击区域打开文件选择器</li>
              <li>🖼️ 图片预览 - 支持图片文件缩略图预览</li>
              <li>✅ 文件验证 - 自动验证文件类型和大小</li>
              <li>📊 进度显示 - 实时显示上传进度</li>
              <li>🚫 自定义验证 - 支持自定义验证规则</li>
              <li>🗑️ 队列管理 - 支持清空已完成或全部文件</li>
            </ul>

            <p style={{ marginBottom: '12px' }}>
              <strong>配置选项：</strong>
            </p>
            <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              <li><code>accept</code> - 接受的文件类型</li>
              <li><code>maxSize</code> - 单个文件最大大小（字节）</li>
              <li><code>maxFiles</code> - 最多文件数量</li>
              <li><code>multiple</code> - 是否允许多文件</li>
              <li><code>showPreview</code> - 是否显示图片预览</li>
              <li><code>uploadImmediately</code> - 选择后立即上传</li>
              <li><code>customValidation</code> - 自定义验证函数</li>
            </ul>

            <p style={{ marginBottom: '12px' }}>
              <strong>支持的验证：</strong>
            </p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>文件类型验证（通过 accept 属性）</li>
              <li>文件大小验证（通过 maxSize 属性）</li>
              <li>文件数量验证（通过 maxFiles 属性）</li>
              <li>自定义验证（通过 customValidation 函数）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropUploaderExample;
