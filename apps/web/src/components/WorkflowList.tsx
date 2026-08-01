import React, { useEffect, useState, useCallback } from 'react';
import { Play, Pause, Edit, Trash2, Plus, Zap, Clock, AlertCircle } from 'lucide-react';
import { Workflow } from '../types/WorkflowTypes';
import { WorkflowEngine } from '../services/WorkflowEngine';
import { useWorkflowStore } from '../store/useWorkflowStore';
import { WorkflowEditor } from './WorkflowEditor';

interface WorkflowListProps {
  workflows?: Workflow[];
  onRefresh?: () => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({ onRefresh }) => {
  const [showEditor, setShowEditor] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { workflows, fetchWorkflows, deleteWorkflowApi, toggleWorkflowApi } = useWorkflowStore();
  const engine = WorkflowEngine.getInstance();

  const loadWorkflows = useCallback(async () => {
    await fetchWorkflows();
    await engine.syncFromApi();
  }, [fetchWorkflows]);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  const handleRefresh = () => {
    void loadWorkflows();
    onRefresh?.();
  };

  const handleToggle = (id: string) => {
    void toggleWorkflowApi(id);
    void engine.syncFromApi();
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setShowEditor(true);
  };

  const handleDelete = (id: string) => {
    void deleteWorkflowApi(id);
    setDeleteConfirm(null);
    void engine.syncFromApi();
  };

  const handleCreate = () => {
    setEditingWorkflow(null);
    setShowEditor(true);
  };

  const handleSave = () => {
    void loadWorkflows();
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '从未执行';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'download_added':
      case 'download_completed':
      case 'download_failed':
      case 'download_paused':
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case 'time_scheduled':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'network_status_changed':
        return <AlertCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Zap className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTriggerLabel = (type: string) => {
    const triggerMap: Record<string, string> = {
      download_added: '下载添加',
      download_completed: '下载完成',
      download_failed: '下载失败',
      download_paused: '下载暂停',
      network_status_changed: '网络变化',
      time_scheduled: '定时触发',
      file_size_exceeded: '文件超限',
      category_added: '分类添加',
      ai_suggestion: 'AI建议',
    };
    return triggerMap[type] || type;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">自动化工作流</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            刷新
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            创建工作流
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className={`p-4 border rounded-lg ${
              workflow.enabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getTriggerIcon(workflow.trigger.type)}
                  <h3 className="font-medium text-gray-800">{workflow.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      workflow.enabled
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {workflow.enabled ? '已启用' : '已禁用'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">触发:</span>
                    {getTriggerLabel(workflow.trigger.type)}
                  </span>
                  {workflow.conditions.length > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">条件:</span>
                      {workflow.conditions.length} 个
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">动作:</span>
                    {workflow.actions.length} 个
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">执行:</span>
                    {workflow.executionCount} 次
                  </span>
                  {workflow.errorCount > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      错误: {workflow.errorCount} 次
                    </span>
                  )}
                  {workflow.lastExecutedAt && (
                    <span className="flex items-center gap-1">
                      <span className="text-gray-400">上次:</span>
                      {formatDate(workflow.lastExecutedAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(workflow.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    workflow.enabled
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                  title={workflow.enabled ? '禁用' : '启用'}
                >
                  {workflow.enabled ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleEdit(workflow)}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                  title="编辑"
                >
                  <Edit className="w-4 h-4" />
                </button>
                {deleteConfirm === workflow.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(workflow.id)}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(workflow.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-8">
          <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">暂无工作流</p>
          <p className="text-sm text-gray-400 mt-1">点击上方按钮创建第一个工作流</p>
        </div>
      )}

      {showEditor && (
        <WorkflowEditor
          workflow={editingWorkflow}
          onClose={() => setShowEditor(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default WorkflowList;