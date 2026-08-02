import { useState, useCallback, useEffect, useRef } from 'react';
import { DownloadItem } from '../types';
import { AISearchService, SemanticSearchResult, AIQueryRewrite, AISearchSuggestion } from '../services/AISearchService';

export interface UseAISearchOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export interface UseAISearchReturn {
  results: SemanticSearchResult[];
  suggestions: AISearchSuggestion[];
  queryRewrite: AIQueryRewrite | null;
  isSearching: boolean;
  isAIEnabled: boolean;
  setQuery: (query: string) => void;
  setEnabled: (enabled: boolean) => void;
  performSearch: (query: string, items: DownloadItem[]) => Promise<void>;
}

export function useAISearch(items: DownloadItem[], options: UseAISearchOptions = {}): UseAISearchReturn {
  const { debounceMs = 300, enabled = true } = options;

  const [queryState, setQueryState] = useState('');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<AISearchSuggestion[]>([]);
  const [queryRewrite, setQueryRewrite] = useState<AIQueryRewrite | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAIEnabled, setIsAIEnabled] = useState(enabled);

  const aiService = AISearchService.getInstance();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
    if (!newQuery.trim()) {
      setResults([]);
      setSuggestions([]);
      setQueryRewrite(null);
    }
  }, []);

  const setEnabled = useCallback((newEnabled: boolean) => {
    setIsAIEnabled(newEnabled);
    if (!newEnabled) {
      setResults([]);
      setSuggestions([]);
      setQueryRewrite(null);
    }
  }, []);

  const performSearch = useCallback(async (searchQuery: string, searchItems: DownloadItem[]) => {
    if (!isAIEnabled || !searchQuery.trim()) {
      setResults([]);
      setSuggestions([]);
      setQueryRewrite(null);
      return;
    }

    setIsSearching(true);

    try {
      const result = await aiService.enhancedSearch(searchQuery, searchItems);
      setResults(result.results);
      setSuggestions(result.suggestions);
      setQueryRewrite(result.queryRewrite);
    } catch {
      setResults([]);
      setSuggestions([]);
      setQueryRewrite(null);
    } finally {
      setIsSearching(false);
    }
  }, [isAIEnabled, aiService]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!isAIEnabled || !queryState.trim()) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      void performSearch(queryState, itemsRef.current);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [queryState, debounceMs, isAIEnabled, performSearch]);

  return {
    results,
    suggestions,
    queryRewrite,
    isSearching,
    isAIEnabled,
    setQuery,
    setEnabled,
    performSearch,
  };
}

export default useAISearch;