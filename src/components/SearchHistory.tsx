import React, { useState } from 'react';
import { Button } from './ui/shadcn/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/shadcn/Dialog';

interface SearchHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
  onSelect: (keyword: string) => void;
  onRemove: (keyword: string) => void;
  onClear: () => void;
}

const SearchHistory: React.FC<SearchHistoryProps> = ({
  isOpen,
  onClose,
  history,
  onSelect,
  onRemove,
  onClear,
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClear = () => {
    if (history.length > 5) {
      setShowClearConfirm(true);
    } else {
      onClear();
      onClose();
    }
  };

  const confirmClear = () => {
    onClear();
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🕐 搜索历史记录
            </DialogTitle>
            <DialogDescription>
              快速访问您之前搜索过的关键词
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-500">
              共 {history.length} 条记录
            </span>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-error-500 hover:text-error-600 hover:border-error-500"
              >
                🗑️ 清空全部
              </Button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <span className="text-4xl mb-4">🔍</span>
              <p className="text-center">暂无搜索历史</p>
              <p className="text-sm mt-2">开始搜索以下载记录</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-1">
              {history.map((keyword, index) => (
                <div
                  key={`${keyword}-${index}`}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                  onMouseEnter={() => setHoveredItem(keyword)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <span className="text-lg">⏱️</span>
                  <button
                    className="flex-1 text-left text-sm text-gray-700 hover:text-blue-600 truncate"
                    onClick={() => {
                      onSelect(keyword);
                      onClose();
                    }}
                  >
                    {keyword}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-error-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(keyword);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ⚠️ 确认清空
            </DialogTitle>
            <DialogDescription>
              确定要清空所有搜索历史记录吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmClear}>
              确认清空
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SearchHistory;
