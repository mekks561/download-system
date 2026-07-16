import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/shadcn/Dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from './ui/shadcn/Tabs';
import { Input } from './ui/shadcn/Input';
import { Button } from './ui/shadcn/Button';
import { Label } from './ui/shadcn/Label';
import { Separator } from './ui/shadcn/Separator';
import { Badge } from './ui/shadcn/Badge';
import { TagApiService, Tag } from '../services';

export interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFileIds?: number[];
  fileType?: string;
  onTagsChanged?: () => void;
}

const PRESET_COLORS = [
  '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4',
  '#10b981', '#84cc16', '#f59e0b', '#ef4444',
  '#f97316', '#6366f1', '#ec4899', '#14b8a6',
];

const TagManager: React.FC<TagManagerProps> = ({
  isOpen,
  onClose,
  selectedFileIds = [],
  fileType = 'download',
  onTagsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [newTagDescription, setNewTagDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      void loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await TagApiService.getTags();
      if (response.success && response.data) {
        setTags(response.data);
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setActiveTab('list');
    setEditingTag(null);
    setNewTagName('');
    setNewTagColor(PRESET_COLORS[0]);
    setNewTagDescription('');
    setSearchTerm('');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await TagApiService.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        description: newTagDescription || undefined,
      });

      if (response.success) {
        void loadTags();
        setNewTagName('');
        setNewTagColor(PRESET_COLORS[0]);
        setNewTagDescription('');
        setActiveTab('list');
      }
    } catch (error) {
      console.error('创建标签失败:', error);
    }
  };

  const handleUpdateTag = async () => {
    if (!editingTag || !newTagName.trim()) return;

    try {
      const response = await TagApiService.updateTag(editingTag.id, {
        name: newTagName.trim(),
        color: newTagColor,
        description: newTagDescription || undefined,
      });

      if (response.success) {
        void loadTags();
        setEditingTag(null);
        setNewTagName('');
        setActiveTab('list');
      }
    } catch (error) {
      console.error('更新标签失败:', error);
    }
  };

  const handleDeleteTag = async (id: number) => {
    if (!window.confirm('确定要删除此标签吗？')) return;

    try {
      const response = await TagApiService.deleteTag(id);
      if (response.success) {
        void loadTags();
      }
    } catch (error) {
      console.error('删除标签失败:', error);
    }
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
    setNewTagDescription(tag.description || '');
    setActiveTab('edit');
  };

  const handleAddTagsToFiles = async (tagIds: number[]) => {
    if (selectedFileIds.length === 0) return;

    try {
      for (const fileId of selectedFileIds) {
        await TagApiService.addTagsToFile(fileId, fileType, { tagIds });
      }
      onTagsChanged?.();
      onClose();
    } catch (error) {
      console.error('添加标签失败:', error);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderTagList = () => (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="搜索标签..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="text-sm text-gray-500">
        共 {filteredTags.length} 个标签
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="text-5xl mb-4 animate-spin">🔄</span>
          <p className="text-sm">加载中...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="text-5xl mb-4">🏷️</span>
          <p className="text-sm mb-4">
            {searchTerm ? '未找到匹配的标签' : '暂无标签'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setActiveTab('create')}>
              创建第一个标签
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
          {filteredTags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">
                  {tag.name}
                </div>
                {tag.description && (
                  <div className="text-xs text-gray-500 truncate">
                    {tag.description}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  使用 {tag.usage_count} 次
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => handleEditTag(tag)}
                >
                  ✏️
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => void handleDeleteTag(tag.id)}
                >
                  🗑️
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTagForm = (isEdit: boolean) => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="tag-name">标签名称</Label>
        <Input
          id="tag-name"
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="输入标签名称"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>选择颜色</Label>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              className={`w-12 h-12 rounded-lg cursor-pointer text-white font-bold text-base transition-all duration-200 border-3 ${
                newTagColor === color
                  ? 'border-gray-900 scale-110'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setNewTagColor(color)}
            >
              {newTagColor === color && '✓'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tag-description">标签描述（可选）</Label>
        <Input
          id="tag-description"
          type="text"
          value={newTagDescription}
          onChange={(e) => setNewTagDescription(e.target.value)}
          placeholder="输入标签描述"
        />
      </div>

      <div className="space-y-2">
        <Label>预览</Label>
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: newTagColor }}
          >
            {newTagName.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">
              {newTagName || '标签名称'}
            </div>
            {newTagDescription && (
              <div className="text-xs text-gray-500">
                {newTagDescription}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            setActiveTab('list');
            setEditingTag(null);
            setNewTagName('');
          }}
        >
          取消
        </Button>
        <Button
          onClick={() => void (isEdit ? handleUpdateTag() : handleCreateTag())}
          disabled={!newTagName.trim()}
        >
          {isEdit ? '保存修改' : '创建标签'}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              标签管理
            </DialogTitle>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'list' | 'create' | 'edit')}
            className="w-full mt-4"
          >
            <TabsList>
              <TabsTrigger value="list">🏷️ 标签列表</TabsTrigger>
              <TabsTrigger value="create">➕ 创建标签</TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {activeTab === 'list' && renderTagList()}
          {activeTab === 'create' && renderTagForm(false)}
          {activeTab === 'edit' && editingTag && renderTagForm(true)}
        </div>

        {selectedFileIds.length > 0 && tags.length > 0 && (
          <>
            <Separator />
            <DialogFooter className="flex-col items-start sm:flex-row sm:justify-start gap-3 px-6 py-4 bg-gray-50">
              <div className="text-sm text-gray-500">
                已选择 {selectedFileIds.length} 个文件，添加标签：
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag.id}
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                    onClick={() => void handleAddTagsToFiles([tag.id])}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TagManager;