import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  FileText,
  Image,
  Video,
  Radio,
  Package,
  Archive,
  File,
  Lightbulb,
  Clock,
  Zap,
  TrendingUp,
  X,
  ChevronRight,
  Loader2,
  Settings,
  Search,
} from 'lucide-react';
import { useAIAssistantStore, DEFAULT_CATEGORIES } from '../store/useAIAssistantStore';
import { AIAssistantService, AISuggestion, FileCategory } from '../services/AIAssistantService';
import { AISearchService, AISearchSuggestion } from '../services/AISearchService';
import { DownloadItem } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/shadcn/Card';
import { Badge } from './ui/shadcn/Badge';
import { Button } from './ui/shadcn/Button';
import { Slider } from './ui/shadcn/Slider';
import { Input } from './ui/shadcn/Input';

interface AIAssistantProps {
  downloads: DownloadItem[];
}

const iconMap: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-5 h-5" />,
  Image: <Image className="w-5 h-5" />,
  Video: <Video className="w-5 h-5" />,
  Radio: <Radio className="w-5 h-5" />,
  Package: <Package className="w-5 h-5" />,
  Archive: <Archive className="w-5 h-5" />,
  File: <File className="w-5 h-5" />,
};

const suggestionTypeConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  category: { icon: <FileText className="w-4 h-4" />, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  priority: { icon: <Zap className="w-4 h-4" />, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  schedule: { icon: <Clock className="w-4 h-4" />, color: 'text-green-600', bgColor: 'bg-green-50' },
  recommendation: { icon: <Lightbulb className="w-4 h-4" />, color: 'text-purple-600', bgColor: 'bg-purple-50' },
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ downloads }) => {
  const {
    suggestions,
    patterns,
    recommendations,
    isAnalyzing,
    aiEnabled,
    activeCategory,
    setSuggestions,
    setPatterns,
    setRecommendations,
    setIsAnalyzing,
    setAiEnabled,
    setActiveCategory,
    removeSuggestion,
  } = useAIAssistantStore();

  const [showSettings, setShowSettings] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<AISearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const aiService = AIAssistantService.getInstance();
  const aiSearchService = AISearchService.getInstance();

  const handleSearchInputChange = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const suggestions = await aiSearchService.generateSearchSuggestions(query, downloads);
      setSearchSuggestions(suggestions);
    } catch {
      setSearchSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [downloads, aiSearchService]);

  const handleSearchSuggestionClick = (suggestion: AISearchSuggestion) => {
    setSearchQuery(suggestion.query);
    setSearchSuggestions([]);
  };

  const analyzeDownloads = useCallback(async () => {
    if (!aiEnabled) return;

    setIsAnalyzing(true);
    setAnalyzeProgress(0);

    try {
      setAnalyzeProgress(30);
      const scheduleSuggestions = aiService.suggestDownloadSchedule(downloads);
      
      setAnalyzeProgress(60);
      const smartRecommendations = await aiService.generateSmartRecommendations(downloads);
      
      setAnalyzeProgress(80);
      const patternAnalysis = aiService.analyzeDownloadPatterns(downloads);
      
      setAnalyzeProgress(100);

      setSuggestions([...scheduleSuggestions, ...smartRecommendations]);
      setPatterns(patternAnalysis.patterns);
      setRecommendations(patternAnalysis.recommendations);
    } catch {
      setPatterns(['分析失败，请检查网络连接']);
      setRecommendations([]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [downloads, aiEnabled, setSuggestions, setPatterns, setRecommendations, setIsAnalyzing]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (downloads.length > 0) {
        void analyzeDownloads();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [downloads, analyzeDownloads]);

  const handleCategoryClick = (category: FileCategory) => {
    setActiveCategory(activeCategory?.id === category.id ? null : category);
  };

  const handleSuggestionAction = (suggestion: AISuggestion) => {
    suggestion.action();
    removeSuggestion(suggestion.id);
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  智能下载助手
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </CardTitle>
                <CardDescription className="text-sm">
                  {aiEnabled ? 'AI 正在分析您的下载模式' : 'AI 助手已关闭'}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        {showSettings && (
          <CardContent className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">启用 AI 助手</span>
              <button
                onClick={() => setAiEnabled(!aiEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  aiEnabled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    aiEnabled ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
            {aiEnabled && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>分析频率</span>
                  <span>实时</span>
                </div>
                <Slider
                  defaultValue={[100]}
                  max={100}
                  step={25}
                  disabled
                  className="py-2"
                />
              </div>
            )}
          </CardContent>
        )}

        <CardContent className="pt-2">
          <div className="flex items-center gap-2">
            {DEFAULT_CATEGORIES.slice(0, 5).map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeCategory?.id === category.id
                    ? `${category.color} bg-opacity-10 ring-1 ring-offset-1 ring-current`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {iconMap[category.icon]}
                {category.name}
              </button>
            ))}
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === null
                  ? 'text-gray-700 bg-gray-100 ring-1 ring-gray-300'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <File className="w-4 h-4" />
              全部
            </button>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="AI 语义搜索..."
              value={searchQuery}
              onChange={(e) => { void handleSearchInputChange(e.target.value); }}
              className="pl-10 text-sm"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500 animate-spin" />
            )}
          </div>

          {searchSuggestions.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              {searchSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSearchSuggestionClick(suggestion)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-purple-50 transition-colors flex items-center gap-2"
                >
                  <span className="text-purple-500">🤖</span>
                  <span className="flex-1 truncate">{suggestion.query}</span>
                  <span className="text-xs text-gray-400">{suggestion.description}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isAnalyzing && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              <div className="flex-1">
                <div className="text-sm font-medium text-purple-700 mb-2">AI 正在分析...</div>
                <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${analyzeProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {patterns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              下载模式分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {patterns.map((pattern, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50/50 px-3 py-2 rounded-lg"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {pattern}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              智能建议
              <Badge variant="secondary">{suggestions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((suggestion) => {
              const config = suggestionTypeConfig[suggestion.type];
              return (
                <div
                  key={suggestion.id}
                  className={`${config.bgColor} rounded-lg p-3 flex items-start justify-between group`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`${config.color} mt-0.5`}>{config.icon}</div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">{suggestion.title}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{suggestion.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          置信度: {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSuggestionAction(suggestion)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      执行
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSuggestion(suggestion.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              优化建议
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-gray-700"
              >
                <span className="text-purple-500 font-medium">•</span>
                {rec}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isAnalyzing && downloads.length > 0 && (
        <Button
          onClick={() => { void analyzeDownloads(); }}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          重新分析下载模式
        </Button>
      )}
    </div>
  );
};

export default AIAssistant;