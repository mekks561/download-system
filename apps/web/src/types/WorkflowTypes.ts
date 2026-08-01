export type WorkflowTriggerType =
  | 'download_added'
  | 'download_completed'
  | 'download_failed'
  | 'download_paused'
  | 'network_status_changed'
  | 'time_scheduled'
  | 'file_size_exceeded'
  | 'category_added'
  | 'ai_suggestion';

export type WorkflowActionType =
  | 'start_download'
  | 'pause_download'
  | 'resume_download'
  | 'cancel_download'
  | 'set_priority'
  | 'move_to_category'
  | 'add_tag'
  | 'notify'
  | 'schedule_download'
  | 'batch_download'
  | 'auto_classify'
  | 'auto_sort'
  | 'cleanup_completed';

export type WorkflowConditionType =
  | 'file_type'
  | 'file_size'
  | 'priority'
  | 'category'
  | 'network_quality'
  | 'time_of_day'
  | 'download_status'
  | 'custom_expression';

export interface WorkflowTrigger {
  id: string;
  type: WorkflowTriggerType;
  config: Record<string, unknown>;
  description: string;
}

export interface WorkflowCondition {
  id: string;
  type: WorkflowConditionType;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches';
  value: string | number | boolean;
  description: string;
}

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: Record<string, unknown>;
  description: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt: number;
  lastExecutedAt?: number;
  executionCount: number;
  errorCount: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  triggerType: WorkflowTriggerType;
  triggeredBy: Record<string, unknown>;
  actionsExecuted: string[];
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface WorkflowEvent {
  type: WorkflowTriggerType;
  data: Record<string, unknown>;
  timestamp: number;
}

export const TRIGGER_TEMPLATES: Record<WorkflowTriggerType, { label: string; description: string; defaultConfig: Record<string, unknown> }> = {
  download_added: {
    label: '下载任务添加',
    description: '当新的下载任务被添加时触发',
    defaultConfig: {},
  },
  download_completed: {
    label: '下载完成',
    description: '当下载任务完成时触发',
    defaultConfig: {},
  },
  download_failed: {
    label: '下载失败',
    description: '当下载任务失败时触发',
    defaultConfig: {},
  },
  download_paused: {
    label: '下载暂停',
    description: '当下载任务被暂停时触发',
    defaultConfig: {},
  },
  network_status_changed: {
    label: '网络状态变化',
    description: '当网络连接状态或质量变化时触发',
    defaultConfig: { quality: 'any' },
  },
  time_scheduled: {
    label: '定时触发',
    description: '在指定时间或间隔触发',
    defaultConfig: { cron: '0 2 * * *', timezone: 'UTC' },
  },
  file_size_exceeded: {
    label: '文件大小超限',
    description: '当下载文件大小超过指定值时触发',
    defaultConfig: { threshold: 1073741824 },
  },
  category_added: {
    label: '分类添加',
    description: '当新的分类被创建时触发',
    defaultConfig: {},
  },
  ai_suggestion: {
    label: 'AI 建议',
    description: '当 AI 助手生成新建议时触发',
    defaultConfig: {},
  },
};

export const ACTION_TEMPLATES: Record<WorkflowActionType, { label: string; description: string; defaultConfig: Record<string, unknown> }> = {
  start_download: {
    label: '开始下载',
    description: '开始指定的下载任务',
    defaultConfig: {},
  },
  pause_download: {
    label: '暂停下载',
    description: '暂停当前下载任务',
    defaultConfig: {},
  },
  resume_download: {
    label: '恢复下载',
    description: '恢复暂停的下载任务',
    defaultConfig: {},
  },
  cancel_download: {
    label: '取消下载',
    description: '取消下载任务',
    defaultConfig: {},
  },
  set_priority: {
    label: '设置优先级',
    description: '设置下载任务优先级',
    defaultConfig: { priority: 'high' as const },
  },
  move_to_category: {
    label: '移动到分类',
    description: '将下载任务移动到指定分类',
    defaultConfig: { categoryId: 0 },
  },
  add_tag: {
    label: '添加标签',
    description: '为下载任务添加标签',
    defaultConfig: { tags: [] as string[] },
  },
  notify: {
    label: '发送通知',
    description: '发送通知消息',
    defaultConfig: { title: '', message: '', type: 'info' as const },
  },
  schedule_download: {
    label: '定时下载',
    description: '安排下载任务在指定时间开始',
    defaultConfig: { delay: 3600000 },
  },
  batch_download: {
    label: '批量下载',
    description: '批量处理多个下载任务',
    defaultConfig: { filter: {} },
  },
  auto_classify: {
    label: '自动分类',
    description: '自动对下载文件进行分类',
    defaultConfig: {},
  },
  auto_sort: {
    label: '自动排序',
    description: '自动排序下载列表',
    defaultConfig: { sortBy: 'createdAt', sortOrder: 'desc' as const },
  },
  cleanup_completed: {
    label: '清理已完成',
    description: '自动清理已完成的下载任务',
    defaultConfig: { olderThan: 86400000 },
  },
};

export const CONDITION_TEMPLATES: Record<WorkflowConditionType, { label: string; description: string; operators: ('equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches')[] }> = {
  file_type: {
    label: '文件类型',
    description: '根据文件类型筛选',
    operators: ['equals', 'not_equals', 'contains'],
  },
  file_size: {
    label: '文件大小',
    description: '根据文件大小筛选',
    operators: ['greater_than', 'less_than', 'equals'],
  },
  priority: {
    label: '优先级',
    description: '根据优先级筛选',
    operators: ['equals', 'not_equals'],
  },
  category: {
    label: '分类',
    description: '根据分类筛选',
    operators: ['equals', 'not_equals'],
  },
  network_quality: {
    label: '网络质量',
    description: '根据网络质量筛选',
    operators: ['equals', 'not_equals'],
  },
  time_of_day: {
    label: '时间段',
    description: '根据时间筛选',
    operators: ['matches', 'contains'],
  },
  download_status: {
    label: '下载状态',
    description: '根据下载状态筛选',
    operators: ['equals', 'not_equals'],
  },
  custom_expression: {
    label: '自定义表达式',
    description: '使用自定义表达式筛选',
    operators: ['matches'],
  },
};