import React, { useCallback, useMemo, CSSProperties } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

export interface VirtualListProps<T> {
  items: T[];
  height: number | string;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscanCount?: number;
  className?: string;
  style?: CSSProperties;
  onScroll?: (scrollOffset: number) => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  emptyText?: string;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscanCount = 3,
  className,
  style,
  onScroll,
  loading = false,
  loadingComponent,
  emptyComponent,
  emptyText = '暂无数据'
}: VirtualListProps<T>) {
  const itemCount = items.length;
  
  const ItemWrapper = useCallback(({ index, style }: ListChildComponentProps) => {
    if (index >= itemCount) return null;
    
    const item = items[index];
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  }, [items, itemCount, renderItem]);

  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (onScroll) {
      onScroll(scrollOffset);
    }
  }, [onScroll]);

  const listStyle = useMemo(() => ({
    ...style,
    height: typeof height === 'number' ? `${height}px` : height,
  }), [height, style]);

  if (itemCount === 0) {
    if (emptyComponent) {
      return <div style={listStyle}>{emptyComponent}</div>;
    }
    
    return (
      <div 
        style={{
          ...listStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>{emptyText}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <List
        height={typeof height === 'number' ? height : parseInt(height) || 400}
        itemCount={itemCount}
        itemSize={itemHeight}
        width="100%"
        overscanCount={overscanCount}
        className={className}
        style={listStyle}
        onScroll={handleScroll}
      >
        {ItemWrapper}
      </List>
      
      {loading && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderTop: '1px solid #e5e7eb',
        }}>
          {loadingComponent || (
            <span style={{ color: '#6b7280', fontSize: '14px' }}>加载中...</span>
          )}
        </div>
      )}
    </div>
  );
}

export interface InfiniteLoaderProps<T> {
  items: T[];
  loadMore: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  height: number | string;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscanCount?: number;
  className?: string;
  style?: CSSProperties;
  loadingComponent?: React.ReactNode;
  _endComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  emptyText?: string;
}

export function InfiniteLoaderList<T>({
  items,
  loadMore,
  hasMore,
  isLoading,
  height,
  itemHeight,
  renderItem,
  overscanCount = 3,
  className,
  style,
  loadingComponent,
  _endComponent,
  emptyComponent,
  emptyText = '暂无数据'
}: InfiniteLoaderProps<T>) {
  const itemCount = hasMore ? items.length + 1 : items.length;
  
  const ItemWrapper = useCallback(({ index, style }: ListChildComponentProps) => {
    if (index >= itemCount) return null;
    
    if (hasMore && index === items.length) {
      return (
        <div 
          style={{
            ...style,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loadingComponent || (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>加载更多...</div>
            </div>
          )}
        </div>
      );
    }
    
    const item = items[index];
    return (
      <div style={style}>
        {renderItem(item, index)}
      </div>
    );
  }, [items, itemCount, hasMore, renderItem, loadingComponent]);

  const handleItemsRendered = useCallback(({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (hasMore && !isLoading && visibleStopIndex >= items.length - 3) {
      void loadMore();
    }
  }, [hasMore, isLoading, items.length, loadMore]);

  const listStyle = useMemo(() => ({
    ...style,
    height: typeof height === 'number' ? `${height}px` : height,
  }), [height, style]);

  if (items.length === 0 && !isLoading) {
    if (emptyComponent) {
      return <div style={listStyle}>{emptyComponent}</div>;
    }
    
    return (
      <div 
        style={{
          ...listStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <div style={{ color: '#6b7280', fontSize: '14px' }}>{emptyText}</div>
        </div>
      </div>
    );
  }

  return (
    <List
      height={typeof height === 'number' ? height : parseInt(height) || 400}
      itemCount={itemCount}
      itemSize={itemHeight}
      width="100%"
      overscanCount={overscanCount}
      className={className}
      style={listStyle}
      onItemsRendered={handleItemsRendered}
    >
      {ItemWrapper}
    </List>
  );
}

export default VirtualList;
