import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  Input,
  ScrollArea,
  Badge,
  Button
} from './ui/shadcn';
import { AISearchService, SemanticSearchResult } from '../services/AISearchService';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';

interface AIGlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (result: SemanticSearchResult) => void;
}

export const AIGlobalSearchModal: React.FC<AIGlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelect
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { t } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const aiService = AISearchService.getInstance();

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const hits = await aiService.globalVectorSearch(q);
      setResults(hits);
    } catch (err) {
      console.error('Global search failed:', err);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [aiService]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader className="p-4 border-b bg-gray-50/50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔍</span>
            <DialogTitle className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI 全局语义搜索
            </DialogTitle>
            <Badge variant="outline" className="ml-auto text-[10px] bg-indigo-50 text-indigo-600 border-indigo-100">
              Industrial 2.0
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Input
              ref={searchInputRef}
              placeholder="输入关键词，AI 将搜索所有文件（含归档）..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-12 text-lg border-gray-200 focus:ring-2 focus:ring-indigo-500 rounded-xl transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {isSearching ? <LoadingSpinner size="small" /> : <span>⚡</span>}
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((res) => (
                  <div 
                    key={res.id}
                    className="p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all group"
                    onClick={() => onSelect?.(res)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 truncate flex-1">{res.filename}</span>
                      <Badge variant="secondary" className="text-[10px] ml-2 opacity-70 group-hover:opacity-100">
                        相关度: {(res.score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mb-2">{res.url || '未知来源'}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] py-0.5 px-2 bg-gray-100 text-gray-600 rounded-full italic">
                        ✨ {res.reason}
                      </span>
                      <Button variant="ghost" size="sm" className="ml-auto h-7 text-[10px] hover:text-indigo-600">
                        定位任务 →
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : query && !isSearching ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-400">
                <span className="text-4xl mb-4">🏜️</span>
                <p className="text-sm">未找到相关资源</p>
                <p className="text-[11px] mt-1">尝试输入更模糊的语义描述，如“那个关于 AI 的视频”</p>
              </div>
            ) : !query && (
              <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300">
                <span className="text-5xl mb-6 opacity-20">🧠</span>
                <p className="text-sm font-medium">AI 语义引擎已就绪</p>
                <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-sm">
                  {['上周下载的文档', '所有的视频文件', '安装包', '重复的资源'].map(hint => (
                    <div 
                      key={hint} 
                      className="text-[10px] p-2 bg-gray-50 rounded-lg text-center hover:bg-indigo-50 cursor-pointer"
                      onClick={() => setQuery(hint)}
                    >
                      {hint}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </div>
        
        <div className="p-3 bg-gray-50/50 border-t flex justify-between items-center text-[10px] text-gray-400">
          <span>快捷键: Enter 选择 | Esc 退出</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> AI 索引已同步
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
