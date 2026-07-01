import React from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import DownloadItem from './DownloadItem';
import { DownloadItem as DownloadItemType } from '../types';

interface VirtualDownloadListProps {
  items: DownloadItemType[];
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  highlightKeyword?: string;
}

const RowComponent: React.FC<ListChildComponentProps> = ({
  index,
  style,
  data,
}) => {
  const { items, onStart, onPause, onResume, onCancel, onRemove, highlightKeyword } = data as {
    items: DownloadItemType[];
    onStart: (id: string) => void;
    onPause: (id: string) => void;
    onResume: (id: string) => void;
    onCancel: (id: string) => void;
    onRemove: (id: string) => void;
    highlightKeyword?: string;
  };

  const item = items[index];

  return (
    <div style={style} className="download-item-wrapper">
      <DownloadItem
        item={item}
        onStart={onStart}
        onPause={onPause}
        onResume={onResume}
        onCancel={onCancel}
        onRemove={onRemove}
        highlightKeyword={highlightKeyword}
      />
    </div>
  );
};

const Row = React.memo(RowComponent);

const VirtualDownloadListComponent: React.FC<VirtualDownloadListProps> = ({
  items,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRemove,
  highlightKeyword,
}) => {
  const itemHeight = 120;

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📭</span>
        <p>暂无下载任务</p>
        <p className="empty-hint">在上方输入框添加下载链接开始下载</p>
      </div>
    );
  }

  return (
    <div className="virtual-list-container">
      <List
        height={500}
        width="100%"
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={{
          items,
          onStart,
          onPause,
          onResume,
          onCancel,
          onRemove,
          highlightKeyword,
        }}
      >
        {Row}
      </List>
    </div>
  );
};

const VirtualDownloadList = React.memo(VirtualDownloadListComponent);

export default VirtualDownloadList;