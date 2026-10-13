import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  ScrollArea,
  Checkbox,
} from './ui/shadcn';
import { formatBytes } from '../utils/format';

interface TorrentFile {
  name: string;
  size: number;
  path: string;
}

interface TorrentMetadata {
  name: string;
  infoHash: string;
  files: TorrentFile[];
}

interface TorrentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIndices: number[]) => void;
  metadata: TorrentMetadata | null;
  isLoading: boolean;
}

const TorrentPreviewModal: React.FC<TorrentPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  metadata,
  isLoading,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    if (metadata) {
      // 默认全选
      setSelectedIndices(metadata.files.map((_, i) => i));
    }
  }, [metadata]);

  const toggleFile = (index: number) => {
    setSelectedIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const toggleAll = () => {
    if (metadata) {
      if (selectedIndices.length === metadata.files.length) {
        setSelectedIndices([]);
      } else {
        setSelectedIndices(metadata.files.map((_, i) => i));
      }
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedIndices);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>磁力链接解析</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">正在从 DHT 网络拉取元数据，请稍候...</p>
          </div>
        ) : metadata ? (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <h4 className="font-medium text-sm mb-1">种子名称</h4>
              <p className="text-sm break-all">{metadata.name}</p>
              <h4 className="font-medium text-sm mt-3 mb-1">Info Hash</h4>
              <p className="text-xs text-muted-foreground break-all font-mono">
                {metadata.infoHash}
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm">文件列表 ({metadata.files.length})</h4>
                <Button variant="ghost" size="sm" onClick={toggleAll} className="h-7 text-xs">
                  {selectedIndices.length === metadata.files.length ? '全不选' : '全选'}
                </Button>
              </div>
              <ScrollArea className="h-[300px] border rounded-md p-2">
                {metadata.files.length > 0 ? (
                  <ul className="space-y-1">
                    {metadata.files.map((file, idx) => (
                      <li key={idx} className="flex items-center text-sm py-1 border-b last:border-0 border-muted/50">
                        <Checkbox 
                          id={`file-${idx}`}
                          checked={selectedIndices.includes(idx)}
                          onCheckedChange={() => toggleFile(idx)}
                          className="mr-3"
                        />
                        <label 
                          htmlFor={`file-${idx}`}
                          className="flex-1 flex justify-between items-center cursor-pointer overflow-hidden"
                        >
                          <span className="truncate mr-4" title={file.path}>
                            {file.name}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatBytes(file.size)}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    未解析到具体文件信息 (元数据可能仍在拉取中)
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-muted-foreground">
            无法获取元数据
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="text-xs text-muted-foreground">
            已选择 {selectedIndices.length} 个文件
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleConfirm} disabled={isLoading || !metadata || selectedIndices.length === 0}>
              立即开始下载
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TorrentPreviewModal;
