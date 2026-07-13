import { createContext, useContext, useState, useCallback, useEffect, createElement } from 'react';

interface SearchHistoryContextType {
  history: string[];
  addHistory: (keyword: string) => void;
  removeHistory: (keyword: string) => void;
  clearHistory: () => void;
  getHistory: () => string[];
}

const SearchHistoryContext = createContext<SearchHistoryContextType | undefined>(undefined);

const STORAGE_KEY = 'searchHistory';
const MAX_HISTORY = 20;

export function SearchHistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      } catch {
        setHistory([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addHistory = useCallback((keyword: string) => {
    if (!keyword.trim()) return;
    setHistory(prev => {
      const filtered = prev.filter(k => k !== keyword);
      return [keyword, ...filtered].slice(0, MAX_HISTORY);
    });
  }, []);

  const removeHistory = useCallback((keyword: string) => {
    setHistory(prev => prev.filter(k => k !== keyword));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getHistory = useCallback(() => history, [history]);

  const contextValue = { history, addHistory, removeHistory, clearHistory, getHistory };

  return createElement(SearchHistoryContext.Provider, { value: contextValue }, children);
}

export const useSearchHistory = () => {
  const context = useContext(SearchHistoryContext);
  if (!context) {
    throw new Error('useSearchHistory must be used within a SearchHistoryProvider');
  }
  return context;
};

export const searchHistoryService = {
  load: (): string[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },
  save: (history: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  },
  add: (keyword: string) => {
    if (!keyword.trim()) return;
    const history = searchHistoryService.load();
    const filtered = history.filter(k => k !== keyword);
    const newHistory = [keyword, ...filtered].slice(0, MAX_HISTORY);
    searchHistoryService.save(newHistory);
    return newHistory;
  },
  remove: (keyword: string) => {
    const history = searchHistoryService.load();
    const newHistory = history.filter(k => k !== keyword);
    searchHistoryService.save(newHistory);
    return newHistory;
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  },
};
