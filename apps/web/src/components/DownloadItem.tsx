import React, { useState } from 'react';
import { DownloadItem as DownloadItemType } from '../types';
import { DownloadService } from '../services/DownloadService';
import { AISearchService, AIErrorDiagnosis } from '../services/AISearchService';
import { Button } from './ui/shadcn/Button';
import { Progress } from './ui/shadcn/Progress';
import { Badge } from './ui/shadcn/Badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/shadcn/Tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/shadcn/Dialog';

interface DownloadItemProps {
  item: DownloadItemType;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  highlightKeyword?: string;
}

const downloadService = DownloadService.getInstance();

const highlightText = (text: string, keyword: string): React.ReactNode => {
  if (!keyword) return text;
  
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedKeyword})`, 'gi');
  const parts = text.split(regex);
  
  let matchCount = 0;
  return parts.map((part) => {
    if (regex.test(part)) {
      matchCount++;
      return <mark key={`highlight-${part}-${matchCount}`} className="search-highlight">{part}</mark>;
    }
    return part;
  });
};

const DownloadItemComponent: React.FC<DownloadItemProps> = ({
  item,
  onStart,
  onPause,
  onResume,
  onCancel,
  onRemove,
  highlightKeyword,
}) => {
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<AIErrorDiagnosis | null>(null);
  const [showDiagnosisDialog, setShowDiagnosisDialog] = useState(false);

  const handleDiagnose = async () => {
    if (!item.error) return;
    setIsDiagnosing(true);
    try {
      const result = await AISearchService.getInstance().analyzeError(item.error, item.filename, item.url);
      setDiagnosis(result);
      setShowDiagnosisDialog(true);
    } catch (err) {
      console.error('诊断失败:', err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const getStatusText = () => {
    switch (item.status) {
      case 'pending':
        return '等待下载';
      case 'downloading':
        return '下载中';
      case 'paused':
        return '已暂停';
      case 'completed':
        return '已完成';
      case 'error':
        return '下载失败';
      case 'healing':
        return 'AI 自动修复中';
      case 'cancelled':
        return '已取消';
      default:
        return '';
    }
  };

  const getStatusBadgeVariant = (): 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' => {
    switch (item.status) {
      case 'pending':
        return 'secondary';
      case 'downloading':
        return 'default';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'healing':
        return 'secondary';
      case 'cancelled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getAiCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      documents: '📄 文档',
      images: '🖼️ 图片',
      videos: '🎬 视频',
      audio: '🎵 音频',
      software: '💻 软件',
      archives: '📦 压缩包',
      other: '📁 其他',
    };
    return map[cat] || cat;
  };

  const getAiPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔥';
      case 'high': return '⭐';
      case 'normal': return '✅';
      case 'low': return '📉';
      default: return '✅';
    }
  };

  const getActions = () => {
    switch (item.status) {
      case 'pending':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={() => onStart(item.id)}
                className="touch-friendly"
                aria-label="开始下载"
                aria-describedby={`status-${item.id}`}
              >
                ▶️
              </Button>
            </TooltipTrigger>
            <TooltipContent>开始下载</TooltipContent>
          </Tooltip>
        );
      case 'downloading':
        return (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onPause(item.id)}
                  className="touch-friendly"
                  aria-label="暂停下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ⏸️
                </Button>
              </TooltipTrigger>
              <TooltipContent>暂停下载</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onCancel(item.id)}
                  className="touch-friendly"
                  aria-label="取消下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ✖️
                </Button>
              </TooltipTrigger>
              <TooltipContent>取消下载</TooltipContent>
            </Tooltip>
          </>
        );
      case 'paused':
        return (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => onResume(item.id)}
                  className="touch-friendly"
                  aria-label="继续下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ▶️
                </Button>
              </TooltipTrigger>
              <TooltipContent>继续下载</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => onCancel(item.id)}
                  className="touch-friendly"
                  aria-label="取消下载"
                  aria-describedby={`status-${item.id}`}
                >
                  ✖️
                </Button>
              </TooltipTrigger>
              <TooltipContent>取消下载</TooltipContent>
            </Tooltip>
          </>
        );
      case 'completed':
        return (
          <>
            {(window as any).electronAPI && item.metadata?.fullPath && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const fullPath = item.metadata?.fullPath;
                      if (fullPath) (window as any).electronAPI.showItemInFolder(fullPath);
                    }}
                    className="touch-friendly"
                    aria-label="在文件夹中显示"
                  >
                    📂
                  </Button>
                </TooltipTrigger>
                <TooltipContent>在文件夹中显示</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onRemove(item.id)}
                  className="touch-friendly"
                  aria-label="删除记录"
                  aria-describedby={`status-${item.id}`}
                >
                  🗑️
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除记录</TooltipContent>
            </Tooltip>
          </>
        );
      case 'cancelled':
      case 'error':
        return (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleDiagnose}
                  className={`touch-friendly ${isDiagnosing ? 'animate-pulse' : ''}`}
                  disabled={isDiagnosing}
                  aria-label="AI 诊断"
                >
                  🤖
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI 诊断错误</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={() => onResume(item.id)}
                  className="touch-friendly"
                  aria-label="重新下载"
                  aria-describedby={`status-${item.id}`}
                >
                  🔄
                </Button>
              </TooltipTrigger>
              <TooltipContent>重新下载</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => onRemove(item.id)}
                  className="touch-friendly"
                  aria-label="删除记录"
                  aria-describedby={`status-${item.id}`}
                >
                  🗑️
                </Button>
              </TooltipTrigger>
              <TooltipContent>删除记录</TooltipContent>
            </Tooltip>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div 
        role="listitem"
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 md:p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 touch-ripple active:scale-[0.98] sm:active:scale-100"
        aria-label={`下载项: ${item.filename}`}
        aria-labelledby={`filename-${item.id}`}
        aria-describedby={`status-${item.id}`}
        tabIndex={0}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-primary-50 rounded-lg text-xl md:text-2xl" role="img" aria-hidden="true">
            📥
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate text-sm md:text-base" id={`filename-${item.id}`}>
              {highlightText(item.filename, highlightKeyword || '')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs md:text-sm text-gray-500 flex-wrap">
              <Badge variant={getStatusBadgeVariant()} className={`text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-2 ${item.status === 'healing' ? 'animate-pulse bg-purple-100 text-purple-800' : ''}`} id={`status-${item.id}`}>
                {getStatusText()}
              </Badge>
              {item.metadata?.healingStatus === 'healing' && item.status !== 'healing' && (
                <Badge variant="outline" className="animate-pulse border-purple-200 text-purple-600 text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-2">
                  🤖 AI 修复中...
                </Badge>
              )}
              {item.metadata?.aiDiagnosis && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="border-emerald-200 text-emerald-600 text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-2">
                      ✨ AI 已诊断
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="font-semibold mb-1">AI 诊断建议</div>
                    <div className="text-xs">{item.metadata.aiSolution}</div>
                  </TooltipContent>
                </Tooltip>
              )}
              {item.metadata?.aiCategory && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-2 flex items-center gap-1">
                      <span>🤖</span>
                      {getAiCategoryLabel(item.metadata.aiCategory)}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    AI 智能识别结果: {item.metadata.aiReason || '智能分类'}
                    {item.metadata.aiConfidence && ` (置信度: ${Math.round(item.metadata.aiConfidence * 100)}%)`}
                  </TooltipContent>
                </Tooltip>
              )}
              {item.priority && item.priority !== 'normal' && (
                <Badge variant="outline" className="text-[10px] sm:text-xs py-0 px-1 sm:py-0.5 sm:px-2">
                  {getAiPriorityEmoji(item.priority)} {item.priority.toUpperCase()}
                </Badge>
              )}
              <span className="inline">
                {downloadService.formatFileSize(item.downloadedBytes)} / {downloadService.formatFileSize(item.totalBytes)}
              </span>
              {item.status === 'downloading' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-primary-600 font-mono" aria-label={`下载速度: ${downloadService.formatSpeed(item.speed)}`}>
                        ⚡ {downloadService.formatSpeed(item.speed)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>下载速度</TooltipContent>
                  </Tooltip>
                  {item.peers !== undefined && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground ml-1" aria-label={`连接节点数: ${item.peers}`}>
                          👥 {item.peers}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>连接节点数</TooltipContent>
                    </Tooltip>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {(item.status === 'downloading' || item.status === 'paused') && (
            <div className="flex-1 sm:w-32 md:w-48">
              <Progress 
                value={item.progress} 
                className="h-1.5 sm:h-2"
                aria-valuenow={item.progress}
                aria-label={`进度: ${Math.round(item.progress)}%`}
              />
            </div>
          )}
          <div className="flex justify-end items-center gap-1 md:gap-2" role="toolbar" aria-label="操作按钮">
            {getActions()}
          </div>
        </div>

        {item.error && (
          <div className="w-full mt-2 text-[10px] sm:text-xs text-error-600 bg-error-50 px-2 py-1 rounded-md overflow-hidden" role="alert" aria-live="polite">
            ❌ {item.error}
          </div>
        )}

        <Dialog open={showDiagnosisDialog} onOpenChange={setShowDiagnosisDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                🤖 AI 错误诊断报告
              </DialogTitle>
              <DialogDescription>
                分析文件名: {item.filename}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">🔍 问题诊断</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {diagnosis?.diagnosis || '无法获取诊断信息'}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">💡 解决方案</h4>
                <p className="text-sm text-purple-700 bg-purple-50 p-3 rounded-lg border border-purple-100">
                  {diagnosis?.solution || '请尝试重新下载'}
                </p>
              </div>
              {diagnosis?.isRecoverable && (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                  ✅ 此错误通常可以自动恢复或通过简单操作修复
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDiagnosisDialog(false)}>
                关闭
              </Button>
              {diagnosis?.isRecoverable && (
                <Button onClick={() => {
                  setShowDiagnosisDialog(false);
                  onResume(item.id);
                }}>
                  立即重试
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

const DownloadItem = React.memo(DownloadItemComponent);

export { DownloadItem };
export default DownloadItem;
