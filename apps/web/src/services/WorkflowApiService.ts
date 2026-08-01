import { apiClient, ApiResponse } from './ApiClient';
import { Workflow, WorkflowExecution, WorkflowCondition, WorkflowAction, WorkflowTriggerType } from '../types';

export interface ApiWorkflow {
  id: string;
  user_id: number;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: string | Record<string, unknown>;
  conditions: string | WorkflowCondition[];
  actions: string | WorkflowAction[];
  enabled: number;
  execution_count: number;
  error_count: number;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiWorkflowExecution {
  id: string;
  user_id: number;
  workflow_id: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  event_data: string | Record<string, unknown>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger_type: string;
  trigger_config?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  trigger_type?: string;
  trigger_config?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
  enabled?: boolean;
}

export const convertApiWorkflowToWorkflow = (apiWorkflow: ApiWorkflow): Workflow => {
  const triggerConfig = typeof apiWorkflow.trigger_config === 'string' 
    ? JSON.parse(apiWorkflow.trigger_config) as Record<string, unknown>
    : apiWorkflow.trigger_config;
  
  return {
    id: apiWorkflow.id,
    name: apiWorkflow.name,
    description: apiWorkflow.description || '',
    trigger: {
      id: `t_${apiWorkflow.id}`,
      type: apiWorkflow.trigger_type as unknown as WorkflowTriggerType,
      config: triggerConfig,
      description: '',
    },
    conditions: typeof apiWorkflow.conditions === 'string' 
      ? JSON.parse(apiWorkflow.conditions) as WorkflowCondition[]
      : apiWorkflow.conditions,
    actions: typeof apiWorkflow.actions === 'string' 
      ? JSON.parse(apiWorkflow.actions) as WorkflowAction[]
      : apiWorkflow.actions,
    enabled: apiWorkflow.enabled === 1,
    executionCount: apiWorkflow.execution_count,
    errorCount: apiWorkflow.error_count,
    lastExecutedAt: apiWorkflow.last_executed_at ? new Date(apiWorkflow.last_executed_at).getTime() : undefined,
    createdAt: new Date(apiWorkflow.created_at).getTime(),
  };
};

export const convertApiExecutionToExecution = (apiExecution: ApiWorkflowExecution): WorkflowExecution => {
  const status: 'pending' | 'running' | 'completed' | 'failed' = 
    apiExecution.status === 'skipped' ? 'completed' : apiExecution.status;
  
  const eventData = typeof apiExecution.event_data === 'string' 
    ? JSON.parse(apiExecution.event_data) as Record<string, unknown>
    : apiExecution.event_data;
  
  return {
    id: apiExecution.id,
    workflowId: apiExecution.workflow_id,
    workflowName: '',
    status,
    triggerType: 'download_added',
    triggeredBy: eventData,
    actionsExecuted: [],
    error: apiExecution.error_message || undefined,
    startedAt: new Date(apiExecution.started_at).getTime(),
    completedAt: apiExecution.completed_at ? new Date(apiExecution.completed_at).getTime() : undefined,
  };
};

export class WorkflowApiService {
  public static async getAllWorkflows(): Promise<ApiResponse<ApiWorkflow[]>> {
    return apiClient.get<ApiWorkflow[]>('/workflows');
  }

  public static async getWorkflowById(id: string): Promise<ApiResponse<ApiWorkflow>> {
    return apiClient.get<ApiWorkflow>(`/workflows/${id}`);
  }

  public static async createWorkflow(
    data: CreateWorkflowRequest
  ): Promise<ApiResponse<ApiWorkflow>> {
    return apiClient.post<ApiWorkflow>('/workflows', data);
  }

  public static async updateWorkflow(
    id: string,
    data: UpdateWorkflowRequest
  ): Promise<ApiResponse<ApiWorkflow>> {
    return apiClient.put<ApiWorkflow>(`/workflows/${id}`, data);
  }

  public static async deleteWorkflow(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/workflows/${id}`);
  }

  public static async toggleWorkflow(id: string): Promise<ApiResponse<ApiWorkflow>> {
    return apiClient.post<ApiWorkflow>(`/workflows/${id}/toggle`);
  }

  public static async getWorkflowExecutions(
    workflowId?: string
  ): Promise<ApiResponse<ApiWorkflowExecution[]>> {
    const params: Record<string, string> = {};
    if (workflowId) params.workflowId = workflowId;
    return apiClient.get<ApiWorkflowExecution[]>('/workflows/executions', params);
  }
}