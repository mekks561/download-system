import React, { useState, useCallback } from 'react';
import { X, Plus, Trash2, ChevronDown, Zap, Gauge, CheckCircle } from 'lucide-react';
import {
  Workflow,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowConditionType,
  TRIGGER_TEMPLATES,
  ACTION_TEMPLATES,
  CONDITION_TEMPLATES,
} from '../types/WorkflowTypes';
import { useWorkflowStore } from '../store/useWorkflowStore';

interface WorkflowEditorProps {
  workflow?: Workflow | null;
  onClose: () => void;
  onSave: () => void;
}

interface FormState {
  name: string;
  description: string;
  triggerType: WorkflowTriggerType;
  conditions: Workflow['conditions'];
  actions: Workflow['actions'];
  enabled: boolean;
  triggerConfig: Record<string, unknown>;
  expandedSections: Record<string, boolean>;
}

const createInitialState = (workflow?: Workflow | null): FormState => ({
  name: workflow?.name || '',
  description: workflow?.description || '',
  triggerType: workflow?.trigger.type || 'download_added',
  conditions: workflow?.conditions || [],
  actions: workflow?.actions || [],
  enabled: workflow?.enabled ?? true,
  triggerConfig: workflow?.trigger.config || {},
  expandedSections: {
    trigger: true,
    conditions: true,
    actions: true,
  },
});

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ workflow, onClose, onSave }) => {
  const { createWorkflow, updateWorkflowApi } = useWorkflowStore();
  const [state, setState] = useState<FormState>(() => createInitialState(workflow));

  const toggleSection = useCallback((section: string) => {
    setState((prev) => ({
      ...prev,
      expandedSections: { ...prev.expandedSections, [section]: !prev.expandedSections[section] },
    }));
  }, []);

  const addCondition = useCallback(() => {
    const newCondition: Workflow['conditions'][0] = {
      id: `cond_${Date.now()}`,
      type: 'file_size',
      operator: 'greater_than',
      value: 1073741824,
      description: '',
    };
    setState((prev) => ({ ...prev, conditions: [...prev.conditions, newCondition] }));
  }, []);

  const removeCondition = useCallback((id: string) => {
    setState((prev) => ({ ...prev, conditions: prev.conditions.filter((c) => c.id !== id) }));
  }, []);

  const updateCondition = useCallback((id: string, updates: Partial<Workflow['conditions'][0]>) => {
    setState((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  }, []);

  const addAction = useCallback(() => {
    const newAction: Workflow['actions'][0] = {
      id: `action_${Date.now()}`,
      type: 'notify',
      config: { title: '', message: '', type: 'info' },
      description: '',
    };
    setState((prev) => ({ ...prev, actions: [...prev.actions, newAction] }));
  }, []);

  const removeAction = useCallback((id: string) => {
    setState((prev) => ({ ...prev, actions: prev.actions.filter((a) => a.id !== id) }));
  }, []);

  const updateAction = useCallback((id: string, updates: Partial<Workflow['actions'][0]>) => {
    setState((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    const workflowData = {
      name: state.name,
      description: state.description,
      trigger_type: state.triggerType,
      trigger_config: state.triggerConfig,
      conditions: state.conditions,
      actions: state.actions,
      enabled: state.enabled,
    };

    if (workflow) {
      await updateWorkflowApi(workflow.id, workflowData);
    } else {
      await createWorkflow(workflowData);
    }

    onSave();
    onClose();
  }, [state, workflow, createWorkflow, updateWorkflowApi, onSave, onClose]);

  const getConditionValueInput = useCallback((condition: Workflow['conditions'][0]) => {
    if (condition.type === 'file_size') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={(condition.value as number) / (1024 * 1024) || 0}
            onChange={(e) => updateCondition(condition.id, { value: Number(e.target.value) * 1024 * 1024 })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="文件大小 (MB)"
          />
          <span className="text-gray-500">MB</span>
        </div>
      );
    }

    if (condition.type === 'custom_expression') {
      return (
        <textarea
          value={condition.value as string}
          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="输入自定义表达式，如: download.totalBytes > 1073741824"
          rows={3}
        />
      );
    }

    return (
      <input
        type="text"
        value={condition.value as string}
        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        placeholder="输入值"
      />
    );
  }, [updateCondition]);

  const getActionConfigInput = useCallback((action: Workflow['actions'][0]) => {
    if (action.type === 'notify') {
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={(action.config.title as string) || ''}
            onChange={(e) => updateAction(action.id, { config: { ...action.config, title: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="通知标题"
          />
          <textarea
            value={(action.config.message as string) || ''}
            onChange={(e) => updateAction(action.id, { config: { ...action.config, message: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="通知消息"
            rows={2}
          />
          <select
            value={(action.config.type as string) || 'info'}
            onChange={(e) => updateAction(action.id, { config: { ...action.config, type: e.target.value } })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="info">信息</option>
            <option value="success">成功</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
          </select>
        </div>
      );
    }

    if (action.type === 'set_priority') {
      return (
        <select
          value={(action.config.priority as string) || 'high'}
          onChange={(e) => updateAction(action.id, { config: { ...action.config, priority: e.target.value } })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="low">低</option>
          <option value="normal">普通</option>
          <option value="high">高</option>
          <option value="urgent">紧急</option>
        </select>
      );
    }

    if (action.type === 'add_tag') {
      return (
        <input
          type="text"
          value={(action.config.tags as string[])?.join(', ') || ''}
          onChange={(e) => updateAction(action.id, { config: { ...action.config, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="标签，用逗号分隔"
        />
      );
    }

    if (action.type === 'cleanup_completed') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={(action.config.olderThan as number) / (1000 * 60 * 60) || 24}
            onChange={(e) => updateAction(action.id, { config: { ...action.config, olderThan: Number(e.target.value) * 1000 * 60 * 60 } })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="清理时间 (小时)"
          />
          <span className="text-gray-500">小时前</span>
        </div>
      );
    }

    if (action.type === 'schedule_download') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={(action.config.delay as number) / (1000 * 60) || 60}
            onChange={(e) => updateAction(action.id, { config: { ...action.config, delay: Number(e.target.value) * 1000 * 60 } })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="延迟时间 (分钟)"
          />
          <span className="text-gray-500">分钟后</span>
        </div>
      );
    }

    return null;
  }, [updateAction]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {workflow ? '编辑工作流' : '创建工作流'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">工作流名称</label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入工作流名称"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">描述</label>
            <textarea
              value={state.description}
              onChange={(e) => setState((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="描述工作流的用途"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled"
              checked={state.enabled}
              onChange={(e) => setState((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
              启用工作流
            </label>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('trigger')}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="font-medium text-gray-700">触发条件</span>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${state.expandedSections.trigger ? 'rotate-180' : ''}`} />
            </button>
            
            {state.expandedSections.trigger && (
              <div className="p-4 space-y-3">
                <select
                  value={state.triggerType}
                  onChange={(e) => {
                    setState((prev) => ({
                      ...prev,
                      triggerType: e.target.value as WorkflowTriggerType,
                      triggerConfig: TRIGGER_TEMPLATES[e.target.value as WorkflowTriggerType].defaultConfig,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(TRIGGER_TEMPLATES).map(([type, template]) => (
                    <option key={type} value={type}>
                      {template.label} - {template.description}
                    </option>
                  ))}
                </select>
                
                {state.triggerType === 'time_scheduled' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={(state.triggerConfig.cron as string) || '0 2 * * *'}
                      onChange={(e) => setState((prev) => ({ ...prev, triggerConfig: { ...prev.triggerConfig, cron: e.target.value } }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Cron表达式"
                    />
                    <select
                      value={(state.triggerConfig.timezone as string) || 'local'}
                      onChange={(e) => setState((prev) => ({ ...prev, triggerConfig: { ...prev.triggerConfig, timezone: e.target.value } }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="local">本地时间</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('conditions')}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-700">条件判断</span>
                {state.conditions.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                    {state.conditions.length}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${state.expandedSections.conditions ? 'rotate-180' : ''}`} />
            </button>
            
            {state.expandedSections.conditions && (
              <div className="p-4">
                {state.conditions.length === 0 ? (
                  <p className="text-gray-500 text-sm mb-3">没有设置条件，工作流将在触发时直接执行</p>
                ) : (
                  <div className="space-y-3 mb-3">
                    {state.conditions.map((condition) => (
                      <div key={condition.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <select
                          value={condition.type}
                          onChange={(e) => updateCondition(condition.id, { type: e.target.value as WorkflowConditionType })}
                          className="flex-shrink-0 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {Object.entries(CONDITION_TEMPLATES).map(([type, template]) => (
                            <option key={type} value={type}>{template.label}</option>
                          ))}
                        </select>
                        <select
                          value={condition.operator}
                          onChange={(e) => updateCondition(condition.id, { operator: e.target.value as Workflow['conditions'][0]['operator'] })}
                          className="flex-shrink-0 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {CONDITION_TEMPLATES[condition.type].operators.map((op) => (
                            <option key={op} value={op}>
                              {op === 'equals' && '等于'}
                              {op === 'not_equals' && '不等于'}
                              {op === 'greater_than' && '大于'}
                              {op === 'less_than' && '小于'}
                              {op === 'contains' && '包含'}
                              {op === 'matches' && '匹配'}
                            </option>
                          ))}
                        </select>
                        {getConditionValueInput(condition)}
                        <button
                          onClick={() => removeCondition(condition.id)}
                          className="flex-shrink-0 p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={addCondition}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">添加条件</span>
                </button>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('actions')}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-700">执行动作</span>
                {state.actions.length > 0 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded-full">
                    {state.actions.length}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${state.expandedSections.actions ? 'rotate-180' : ''}`} />
            </button>
            
            {state.expandedSections.actions && (
              <div className="p-4">
                {state.actions.length === 0 ? (
                  <p className="text-gray-500 text-sm mb-3">请添加至少一个执行动作</p>
                ) : (
                  <div className="space-y-3 mb-3">
                    {state.actions.map((action) => (
                      <div key={action.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <select
                          value={action.type}
                          onChange={(e) => updateAction(action.id, { type: e.target.value as WorkflowActionType })}
                          className="flex-shrink-0 px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          {Object.entries(ACTION_TEMPLATES).map(([type, template]) => (
                            <option key={type} value={type}>{template.label}</option>
                          ))}
                        </select>
                        <div className="flex-1">
                          {getActionConfigInput(action)}
                        </div>
                        <button
                          onClick={() => removeAction(action.id)}
                          className="flex-shrink-0 p-1 hover:bg-red-100 rounded text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={addAction}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">添加动作</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={!state.name || state.actions.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {workflow ? '保存修改' : '创建工作流'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditor;
