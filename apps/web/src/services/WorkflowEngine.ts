import {
  Workflow,
  WorkflowEvent,
  WorkflowExecution,
  WorkflowActionType,
  WorkflowConditionType,
} from '../types/WorkflowTypes';
import { DownloadItem } from '../types';
import { DownloadService } from './DownloadService';
import { NetworkQualityService } from './NetworkQualityService';
import { AIAssistantService } from './AIAssistantService';
import { WorkflowApiService, convertApiWorkflowToWorkflow } from './WorkflowApiService';

export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private workflows: Workflow[] = [];
  private executions: WorkflowExecution[] = [];
  private readonly STORAGE_KEY = 'workflows';
  private readonly MAX_EXECUTIONS = 100;
  private downloadService: DownloadService;
  private networkService: NetworkQualityService;
  private listeners: Set<(workflow: Workflow, execution: WorkflowExecution) => void> = new Set();
  private scheduledTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  private constructor() {
    this.downloadService = DownloadService.getInstance();
    this.networkService = NetworkQualityService.getInstance();
    this.loadWorkflows();
    this.setupScheduledWorkflows();
    this.setupNetworkListener();
  }

  private get aiService(): AIAssistantService {
    return AIAssistantService.getInstance();
  }

  public static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  private loadWorkflows(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.workflows = JSON.parse(stored) as Workflow[];
      } else {
        this.workflows = this.getDefaultWorkflows();
        this.saveWorkflows();
      }
    } catch {
      this.workflows = this.getDefaultWorkflows();
    }
  }

  private getDefaultWorkflows(): Workflow[] {
    return [
      {
        id: 'wf_auto_classify',
        name: '自动分类下载',
        description: '新下载任务添加时自动进行AI分类',
        trigger: {
          id: 't1',
          type: 'download_added',
          config: {},
          description: '当新的下载任务被添加时',
        },
        conditions: [],
        actions: [
          {
            id: 'a1',
            type: 'auto_classify',
            config: {},
            description: '自动分类',
          },
        ],
        enabled: true,
        createdAt: Date.now(),
        executionCount: 0,
        errorCount: 0,
      },
      {
        id: 'wf_large_file_notify',
        name: '大文件通知',
        description: '当下载文件超过1GB时发送通知',
        trigger: {
          id: 't2',
          type: 'download_added',
          config: {},
          description: '当新的下载任务被添加时',
        },
        conditions: [
          {
            id: 'c1',
            type: 'file_size',
            operator: 'greater_than',
            value: 1073741824,
            description: '文件大小超过1GB',
          },
        ],
        actions: [
          {
            id: 'a2',
            type: 'notify',
            config: {
              title: '大文件下载提醒',
              message: '检测到大文件下载，请确保有足够的存储空间',
              type: 'warning',
            },
            description: '发送通知',
          },
        ],
        enabled: true,
        createdAt: Date.now(),
        executionCount: 0,
        errorCount: 0,
      },
      {
        id: 'wf_cleanup_daily',
        name: '每日清理已完成',
        description: '每天凌晨2点自动清理24小时前已完成的下载',
        trigger: {
          id: 't3',
          type: 'time_scheduled',
          config: { cron: '0 2 * * *', timezone: 'local' },
          description: '每天凌晨2点',
        },
        conditions: [],
        actions: [
          {
            id: 'a3',
            type: 'cleanup_completed',
            config: { olderThan: 86400000 },
            description: '清理24小时前已完成的下载',
          },
        ],
        enabled: true,
        createdAt: Date.now(),
        executionCount: 0,
        errorCount: 0,
      },
    ];
  }

  private saveWorkflows(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.workflows));
    } catch {
      // ignore
    }
  }

  private setupScheduledWorkflows(): void {
    this.workflows.forEach((workflow) => {
      if (workflow.enabled && workflow.trigger.type === 'time_scheduled') {
        this.scheduleWorkflow(workflow);
      }
    });
  }

  private scheduleWorkflow(workflow: Workflow): void {
    const cronExpression = workflow.trigger.config.cron as string;
    const delay = this.parseCronToDelay(cronExpression);

    if (delay > 0) {
      const timer = setTimeout(() => {
        void this.triggerWorkflow('time_scheduled', { workflowId: workflow.id });
        this.scheduleWorkflow(workflow);
      }, delay);

      this.scheduledTimers.set(workflow.id, timer);
    }
  }

  private parseCronToDelay(cronExpression: string): number {
    try {
      const parts = cronExpression.split(' ');
      if (parts.length >= 2) {
        const hour = parseInt(parts[1], 10);
        const minute = parseInt(parts[0], 10);

        const now = new Date();
        const target = new Date();
        target.setHours(hour, minute, 0, 0);

        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }

        return target.getTime() - now.getTime();
      }
    } catch {
      // ignore
    }

    return 24 * 60 * 60 * 1000;
  }

  private setupNetworkListener(): void {
    this.networkService.addListener(() => {
      const quality = this.networkService.getQuality();
      void this.triggerWorkflow('network_status_changed', { quality });
    });
  }

  public getWorkflows(): Workflow[] {
    return [...this.workflows];
  }

  public getWorkflowById(id: string): Workflow | undefined {
    return this.workflows.find((w) => w.id === id);
  }

  public async syncFromApi(): Promise<void> {
    try {
      const response = await WorkflowApiService.getAllWorkflows();
      if (response.success && response.data) {
        const apiWorkflows = response.data.map(convertApiWorkflowToWorkflow);

        this.workflows.forEach((w) => {
          if (w.trigger.type === 'time_scheduled') {
            const timer = this.scheduledTimers.get(w.id);
            if (timer) {
              clearTimeout(timer);
              this.scheduledTimers.delete(w.id);
            }
          }
        });

        this.workflows = apiWorkflows;
        this.saveWorkflows();
        this.setupScheduledWorkflows();
      }
    } catch {
      // ignore API sync errors, fall back to localStorage
    }
  }

  public addWorkflow(workflow: Omit<Workflow, 'id' | 'createdAt' | 'executionCount' | 'errorCount'>): Workflow {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      executionCount: 0,
      errorCount: 0,
    };

    this.workflows.push(newWorkflow);
    this.saveWorkflows();

    if (newWorkflow.enabled && newWorkflow.trigger.type === 'time_scheduled') {
      this.scheduleWorkflow(newWorkflow);
    }

    return newWorkflow;
  }

  public updateWorkflow(id: string, updates: Partial<Workflow>): boolean {
    const index = this.workflows.findIndex((w) => w.id === id);
    if (index === -1) return false;

    const oldWorkflow = this.workflows[index];
    this.workflows[index] = { ...this.workflows[index], ...updates };
    this.saveWorkflows();

    if (oldWorkflow.trigger.type === 'time_scheduled') {
      const timer = this.scheduledTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.scheduledTimers.delete(id);
      }
    }

    const newWorkflow = this.workflows[index];
    if (newWorkflow.enabled && newWorkflow.trigger.type === 'time_scheduled') {
      this.scheduleWorkflow(newWorkflow);
    }

    return true;
  }

  public deleteWorkflow(id: string): boolean {
    const index = this.workflows.findIndex((w) => w.id === id);
    if (index === -1) return false;

    const timer = this.scheduledTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.scheduledTimers.delete(id);
    }

    this.workflows.splice(index, 1);
    this.saveWorkflows();
    return true;
  }

  public toggleWorkflow(id: string): boolean {
    const workflow = this.workflows.find((w) => w.id === id);
    if (!workflow) return false;

    workflow.enabled = !workflow.enabled;
    this.saveWorkflows();

    if (workflow.trigger.type === 'time_scheduled') {
      const timer = this.scheduledTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.scheduledTimers.delete(id);
      }

      if (workflow.enabled) {
        this.scheduleWorkflow(workflow);
      }
    }

    return true;
  }

  public async triggerWorkflow(type: string, data: Record<string, unknown>): Promise<void> {
    const event: WorkflowEvent = {
      type: type as never,
      data,
      timestamp: Date.now(),
    };

    const matchingWorkflows = this.workflows.filter((w) => {
      if (!w.enabled) return false;
      if (w.trigger.type !== event.type) return false;
      return true;
    });

    for (const workflow of matchingWorkflows) {
      await this.executeWorkflow(workflow, event);
    }
  }

  private async executeWorkflow(workflow: Workflow, event: WorkflowEvent): Promise<void> {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: 'running',
      triggerType: workflow.trigger.type,
      triggeredBy: event.data,
      actionsExecuted: [],
      startedAt: Date.now(),
    };

    this.executions.push(execution);
    if (this.executions.length > this.MAX_EXECUTIONS) {
      this.executions.shift();
    }

    try {
      const conditionsMet = this.evaluateConditions(workflow.conditions, event.data);

      if (!conditionsMet) {
        execution.status = 'completed';
        execution.completedAt = Date.now();
        return;
      }

      for (const action of workflow.actions) {
        try {
          await this.executeAction(action, event.data);
          execution.actionsExecuted.push(action.type);
        } catch (error) {
          execution.error = error instanceof Error ? error.message : 'Unknown error';
          execution.status = 'failed';
          workflow.errorCount++;
          break;
        }
      }

      if (execution.status === 'running') {
        execution.status = 'completed';
        workflow.executionCount++;
      }

      workflow.lastExecutedAt = Date.now();
      execution.completedAt = Date.now();

      this.saveWorkflows();
      this.notifyListeners(workflow, execution);
    } catch (error) {
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.status = 'failed';
      workflow.errorCount++;
      workflow.lastExecutedAt = Date.now();
      execution.completedAt = Date.now();

      this.saveWorkflows();
      this.notifyListeners(workflow, execution);
    }
  }

  private evaluateConditions(
    conditions: { type: WorkflowConditionType; operator: string; value: string | number | boolean }[],
    eventData: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return true;

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, eventData);
      if (!result) return false;
    }

    return true;
  }

  private evaluateCondition(
    condition: { type: WorkflowConditionType; operator: string; value: string | number | boolean },
    eventData: Record<string, unknown>
  ): boolean {
    const { type, operator, value } = condition;
    let actualValue: string | number | boolean | undefined;

    switch (type) {
      case 'file_size':
        actualValue = (eventData as { download?: DownloadItem }).download?.totalBytes;
        break;
      case 'file_type': {
        const filename = (eventData as { download?: DownloadItem }).download?.filename || '';
        const ext = filename.split('.').pop()?.toLowerCase();
        actualValue = ext;
        break;
      }
      case 'priority':
        actualValue = (eventData as { download?: DownloadItem }).download?.priority;
        break;
      case 'category':
        actualValue = (eventData as { download?: DownloadItem }).download?.category_id;
        break;
      case 'network_quality':
        actualValue = this.networkService.getQuality();
        break;
      case 'download_status':
        actualValue = (eventData as { download?: DownloadItem }).download?.status;
        break;
      case 'time_of_day': {
        const hour = new Date().getHours();
        actualValue = `${hour}:00`;
        break;
      }
      case 'custom_expression':
        return false;
      default:
        return true;
    }

    if (actualValue === undefined) return false;

    switch (operator) {
      case 'equals':
        return actualValue === value;
      case 'not_equals':
        return actualValue !== value;
      case 'greater_than':
        return Number(actualValue) > Number(value);
      case 'less_than':
        return Number(actualValue) < Number(value);
      case 'contains':
        return String(actualValue).includes(String(value));
      case 'matches':
        try {
          const regex = new RegExp(String(value));
          return regex.test(String(actualValue));
        } catch {
          return false;
        }
      default:
        return true;
    }
  }

  private async executeAction(action: { type: WorkflowActionType; config: Record<string, unknown> }, eventData: Record<string, unknown>): Promise<void> {
    const download = (eventData as { download?: DownloadItem }).download;

    switch (action.type) {
      case 'auto_classify':
        if (download) {
          const classification = await this.aiService.classifyFile(download.filename, download.url);
          if (classification.category.id !== 'other') {
            // TODO: Update category in store
          }
        }
        break;

      case 'notify': {
        const title = action.config.title as string || '工作流通知';
        const message = action.config.message as string || '';
        const type = action.config.type as 'success' | 'error' | 'warning' | 'info' || 'info';
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body: message });
        }

        console.warn(`[Workflow] ${type.toUpperCase()}: ${title} - ${message}`);
        
        break;
      }

      case 'set_priority': {
        const priority = action.config.priority as string;
        if (download && priority) {
          // TODO: Update priority in store
        }
        break;
      }

      case 'add_tag': {
        const tags = action.config.tags as string[] || [];
        if (download && tags.length > 0) {
          // TODO: Add tags to download
        }
        break;
      }

      case 'cleanup_completed': {
        // TODO: Remove downloads completed before configured time
        break;
      }

      case 'pause_download':
        if (download) {
          // TODO: Pause download
        }
        break;

      case 'resume_download':
        if (download) {
          // TODO: Resume download
        }
        break;

      case 'cancel_download':
        if (download) {
          // TODO: Cancel download
        }
        break;

      case 'move_to_category': {
        const categoryId = action.config.categoryId as number;
        if (download && categoryId) {
          // TODO: Move to category
        }
        break;
      }

      case 'schedule_download': {
        const delay = action.config.delay as number || 3600000;
        setTimeout(() => {
          if (download) {
            // TODO: Start download
          }
        }, delay);
        break;
      }

      case 'batch_download': {
        // TODO: Batch download based on filter
        break;
      }

      case 'auto_sort': {
        // TODO: Sort downloads
        break;
      }

      case 'start_download':
        if (download) {
          // TODO: Start download
        }
        break;
    }
  }

  public addListener(listener: (workflow: Workflow, execution: WorkflowExecution) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(workflow: Workflow, execution: WorkflowExecution): void {
    this.listeners.forEach((listener) => listener(workflow, execution));
  }

  public getExecutions(workflowId?: string): WorkflowExecution[] {
    if (workflowId) {
      return this.executions.filter((e) => e.workflowId === workflowId);
    }
    return [...this.executions];
  }

  public getWorkflowStats(): Record<string, { executionCount: number; errorCount: number; lastExecutedAt?: number }> {
    const stats: Record<string, { executionCount: number; errorCount: number; lastExecutedAt?: number }> = {};
    
    this.workflows.forEach((workflow) => {
      stats[workflow.id] = {
        executionCount: workflow.executionCount,
        errorCount: workflow.errorCount,
        lastExecutedAt: workflow.lastExecutedAt,
      };
    });

    return stats;
  }

  public generateWorkflowSuggestion(downloadItem?: DownloadItem): string {
    if (!downloadItem) {
      return '建议创建工作流来自动化下载管理任务';
    }

    const suggestions: string[] = [];

    if (downloadItem.totalBytes > 1073741824) {
      suggestions.push('建议创建"大文件通知"工作流');
    }

    if (downloadItem.category_id === undefined || downloadItem.category_id === null) {
      suggestions.push('建议创建"自动分类"工作流');
    }

    if (downloadItem.priority === 'high' || downloadItem.priority === 'urgent') {
      suggestions.push('建议创建"高优先级下载加速"工作流');
    }

    if (suggestions.length === 0) {
      return '当前下载任务无需特殊工作流建议';
    }

    return suggestions.join('；');
  }
}