import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Workflow, WorkflowExecution } from '../types/WorkflowTypes';
import { WorkflowEngine } from '../services/WorkflowEngine';
import { WorkflowApiService, CreateWorkflowRequest, UpdateWorkflowRequest, convertApiWorkflowToWorkflow, convertApiExecutionToExecution } from '../services/WorkflowApiService';

interface WorkflowState {
  workflows: Workflow[];
  executions: WorkflowExecution[];
  isLoading: boolean;
  error: string | null;
  selectedWorkflowId: string | null;
  showEditor: boolean;
  editingWorkflow: Workflow | null;

  setWorkflows: (workflows: Workflow[]) => void;
  setExecutions: (executions: WorkflowExecution[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  toggleWorkflow: (id: string) => void;
  
  setSelectedWorkflowId: (id: string | null) => void;
  setShowEditor: (show: boolean) => void;
  setEditingWorkflow: (workflow: Workflow | null) => void;
  
  refreshWorkflows: () => void;
  refreshExecutions: () => void;
  
  fetchWorkflows: () => Promise<void>;
  fetchExecutions: () => Promise<void>;
  createWorkflow: (data: CreateWorkflowRequest) => Promise<Workflow | null>;
  updateWorkflowApi: (id: string, data: UpdateWorkflowRequest) => Promise<Workflow | null>;
  deleteWorkflowApi: (id: string) => Promise<boolean>;
  toggleWorkflowApi: (id: string) => Promise<Workflow | null>;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  devtools(
    (set) => ({
      workflows: [],
      executions: [],
      isLoading: false,
      error: null,
      selectedWorkflowId: null,
      showEditor: false,
      editingWorkflow: null,

      setWorkflows: (workflows) => set({ workflows }),
      
      setExecutions: (executions) => set({ executions }),
      
      addWorkflow: (workflow) =>
        set((state) => ({ workflows: [...state.workflows, workflow] })),
      
      updateWorkflow: (id, updates) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        })),
      
      deleteWorkflow: (id) =>
        set((state) => ({
          workflows: state.workflows.filter((w) => w.id !== id),
        })),
      
      toggleWorkflow: (id) =>
        set((state) => ({
          workflows: state.workflows.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled } : w
          ),
        })),
      
      setSelectedWorkflowId: (id) => set({ selectedWorkflowId: id }),
      
      setShowEditor: (show) => set({ showEditor: show }),
      
      setEditingWorkflow: (workflow) => set({ editingWorkflow: workflow }),
      
      refreshWorkflows: () => {
        const engine = WorkflowEngine.getInstance();
        const workflows = engine.getWorkflows();
        set({ workflows });
      },
      
      refreshExecutions: () => {
        const engine = WorkflowEngine.getInstance();
        const executions = engine.getExecutions();
        set({ executions });
      },
      
      fetchWorkflows: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await WorkflowApiService.getAllWorkflows();
          if (response.success && response.data) {
            const workflows = response.data.map(convertApiWorkflowToWorkflow);
            set({ workflows, error: null });
          } else {
            set({ error: response.message || '获取工作流失败' });
          }
        } catch {
          set({ error: '网络请求失败' });
        } finally {
          set({ isLoading: false });
        }
      },
      
      fetchExecutions: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await WorkflowApiService.getWorkflowExecutions();
          if (response.success && response.data) {
            const executions = response.data.map(convertApiExecutionToExecution);
            set({ executions, error: null });
          } else {
            set({ error: response.message || '获取执行日志失败' });
          }
        } catch {
          set({ error: '网络请求失败' });
        } finally {
          set({ isLoading: false });
        }
      },
      
      createWorkflow: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await WorkflowApiService.createWorkflow(data);
          if (response.success && response.data) {
            const workflow = convertApiWorkflowToWorkflow(response.data);
            set((state) => ({ workflows: [...state.workflows, workflow], error: null }));
            return workflow;
          } else {
            set({ error: response.message || '创建工作流失败' });
            return null;
          }
        } catch {
          set({ error: '网络请求失败' });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateWorkflowApi: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await WorkflowApiService.updateWorkflow(id, data);
          if (response.success && response.data) {
            const workflow = convertApiWorkflowToWorkflow(response.data);
            set((state) => ({
              workflows: state.workflows.map((w) => (w.id === id ? workflow : w)),
              error: null,
            }));
            return workflow;
          } else {
            set({ error: response.message || '更新工作流失败' });
            return null;
          }
        } catch {
          set({ error: '网络请求失败' });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },
      
      deleteWorkflowApi: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await WorkflowApiService.deleteWorkflow(id);
          if (response.success) {
            set((state) => ({ workflows: state.workflows.filter((w) => w.id !== id), error: null }));
            return true;
          } else {
            set({ error: response.message || '删除工作流失败' });
            return false;
          }
        } catch {
          set({ error: '网络请求失败' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },
      
      toggleWorkflowApi: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const response = await WorkflowApiService.toggleWorkflow(id);
          if (response.success && response.data) {
            const workflow = convertApiWorkflowToWorkflow(response.data);
            set((state) => ({
              workflows: state.workflows.map((w) => (w.id === id ? workflow : w)),
              error: null,
            }));
            return workflow;
          } else {
            set({ error: response.message || '切换工作流状态失败' });
            return null;
          }
        } catch {
          set({ error: '网络请求失败' });
          return null;
        } finally {
          set({ isLoading: false });
        }
      },
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
    }),
    { name: 'WorkflowStore' }
  )
);