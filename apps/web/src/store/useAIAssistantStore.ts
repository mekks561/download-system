import { create } from 'zustand';
import { AISuggestion, FileCategory, DEFAULT_CATEGORIES } from '../services/AIAssistantService';

interface AIAssistantState {
  suggestions: AISuggestion[];
  patterns: string[];
  recommendations: string[];
  isAnalyzing: boolean;
  aiEnabled: boolean;
  activeCategory: FileCategory | null;
  setSuggestions: (suggestions: AISuggestion[]) => void;
  setPatterns: (patterns: string[]) => void;
  setRecommendations: (recommendations: string[]) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAiEnabled: (enabled: boolean) => void;
  setActiveCategory: (category: FileCategory | null) => void;
  clearSuggestions: () => void;
  addSuggestion: (suggestion: AISuggestion) => void;
  removeSuggestion: (id: string) => void;
}

export const useAIAssistantStore = create<AIAssistantState>((set) => ({
  suggestions: [],
  patterns: [],
  recommendations: [],
  isAnalyzing: false,
  aiEnabled: true,
  activeCategory: null,
  setSuggestions: (suggestions) => set({ suggestions }),
  setPatterns: (patterns) => set({ patterns }),
  setRecommendations: (recommendations) => set({ recommendations }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAiEnabled: (aiEnabled) => set({ aiEnabled }),
  setActiveCategory: (activeCategory) => set({ activeCategory }),
  clearSuggestions: () => set({ suggestions: [] }),
  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [...state.suggestions, suggestion],
    })),
  removeSuggestion: (id) =>
    set((state) => ({
      suggestions: state.suggestions.filter((s) => s.id !== id),
    })),
}));

export { DEFAULT_CATEGORIES };