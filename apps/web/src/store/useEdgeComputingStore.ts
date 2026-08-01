import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { EdgeComputingService, EdgeComputingMode, EdgeComputingStats, LocalModel, NetworkProfile } from '../services/EdgeComputingService';

interface EdgeComputingState {
  stats: EdgeComputingStats;
  localModels: LocalModel[];
  networkProfiles: NetworkProfile[];
  isLoading: boolean;
  error: string | null;

  setMode: (mode: EdgeComputingMode) => void;
  loadLocalModel: (model: Omit<LocalModel, 'loaded' | 'lastUsed'>) => void;
  unloadLocalModel: (modelId: string) => void;
  runLocalInference: (modelId: string, input: string) => string | null;
  addNetworkProfile: (profile: Omit<NetworkProfile, 'id' | 'createdAt'>) => void;
  updateNetworkProfile: (id: string, updates: Partial<NetworkProfile>) => void;
  deleteNetworkProfile: (id: string) => void;
  refreshStats: () => void;
}

export const useEdgeComputingStore = create<EdgeComputingState>()(
  devtools(
    (set) => {
      const service = EdgeComputingService.getInstance();

      service.addListener((stats) => {
        set({ stats });
      });

      return {
        stats: service.getStats(),
        localModels: service.getLocalModels(),
        networkProfiles: service.getNetworkProfiles(),
        isLoading: false,
        error: null,

        setMode: (mode) => {
          service.setMode(mode);
          set({ stats: service.getStats() });
        },

        loadLocalModel: (model) => {
          set({ isLoading: true, error: null });
          try {
            const success = service.loadLocalModel(model);
            if (success) {
              set({ localModels: service.getLocalModels() });
            } else {
              set({ error: '加载本地模型失败' });
            }
          } catch {
            set({ error: '加载本地模型失败' });
          } finally {
            set({ isLoading: false });
          }
        },

        unloadLocalModel: (modelId) => {
          service.unloadLocalModel(modelId);
          set({ localModels: service.getLocalModels() });
        },

        runLocalInference: (modelId, input) => {
          set({ isLoading: true, error: null });
          try {
            const result = service.runLocalInference(modelId, input);
            return result;
          } catch {
            set({ error: '本地推理失败' });
            return null;
          } finally {
            set({ isLoading: false });
          }
        },

        addNetworkProfile: (profile) => {
          service.addNetworkProfile(profile);
          set({ networkProfiles: service.getNetworkProfiles() });
        },

        updateNetworkProfile: (id, updates) => {
          service.updateNetworkProfile(id, updates);
          set({ networkProfiles: service.getNetworkProfiles() });
        },

        deleteNetworkProfile: (id) => {
          service.deleteNetworkProfile(id);
          set({ networkProfiles: service.getNetworkProfiles() });
        },

        refreshStats: () => {
          set({ stats: service.getStats() });
        },
      };
    },
    { name: 'EdgeComputingStore' }
  )
);