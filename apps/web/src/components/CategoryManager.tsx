import React, { useEffect, useReducer } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/shadcn/Tooltip';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  taskCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (name: string, color: string, icon: string) => void;
  onUpdateCategory: (id: string, name: string, color: string, icon: string) => void;
  onDeleteCategory: (id: string) => void;
  selectedTaskIds?: string[];
  onTasksAddedToCategory?: (categoryId: string, taskIds: string[]) => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const PRESET_ICONS = [
  '📁', '📚', '🎬', '🎵', '🖼️', '📄', '💼', '🎮',
  '📱', '💻', '🌐', '☁️', '📦', '🎨', '📸', '📹',
];

interface CategoryFormState {
  activeTab: 'list' | 'create' | 'edit';
  editingCategory: Category | null;
  newCategoryName: string;
  newCategoryColor: string;
  newCategoryIcon: string;
  searchTerm: string;
}

type CategoryFormAction =
  | { type: 'RESET' }
  | { type: 'SET_ACTIVE_TAB'; tab: 'list' | 'create' | 'edit' }
  | { type: 'SET_EDITING_CATEGORY'; category: Category | null }
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'SET_ICON'; icon: string }
  | { type: 'SET_SEARCH'; term: string };

const categoryFormReducer = (state: CategoryFormState, action: CategoryFormAction): CategoryFormState => {
  switch (action.type) {
    case 'RESET':
      return {
        activeTab: 'list',
        editingCategory: null,
        newCategoryName: '',
        newCategoryColor: PRESET_COLORS[0],
        newCategoryIcon: PRESET_ICONS[0],
        searchTerm: '',
      };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };
    case 'SET_EDITING_CATEGORY':
      return { ...state, editingCategory: action.category };
    case 'SET_NAME':
      return { ...state, newCategoryName: action.name };
    case 'SET_COLOR':
      return { ...state, newCategoryColor: action.color };
    case 'SET_ICON':
      return { ...state, newCategoryIcon: action.icon };
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term };
    default:
      return state;
  }
};

const CategoryManager: React.FC<CategoryManagerProps> = ({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  selectedTaskIds = [],
  onTasksAddedToCategory,
}) => {
  const [formState, dispatchForm] = useReducer(categoryFormReducer, {
    activeTab: 'list',
    editingCategory: null,
    newCategoryName: '',
    newCategoryColor: PRESET_COLORS[0],
    newCategoryIcon: PRESET_ICONS[0],
    searchTerm: '',
  });

  const { activeTab, editingCategory, newCategoryName, newCategoryColor, newCategoryIcon, searchTerm } = formState;

  useEffect(() => {
    if (!isOpen) {
      dispatchForm({ type: 'RESET' });
    }
  }, [isOpen]);

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory(newCategoryName.trim(), newCategoryColor, newCategoryIcon);
      dispatchForm({ type: 'SET_NAME', name: '' });
      dispatchForm({ type: 'SET_COLOR', color: PRESET_COLORS[0] });
      dispatchForm({ type: 'SET_ICON', icon: PRESET_ICONS[0] });
      dispatchForm({ type: 'SET_ACTIVE_TAB', tab: 'list' });
    }
  };

  const handleUpdateCategory = () => {
    if (editingCategory && newCategoryName.trim()) {
      onUpdateCategory(editingCategory.id, newCategoryName.trim(), newCategoryColor, newCategoryIcon);
      dispatchForm({ type: 'SET_EDITING_CATEGORY', category: null });
      dispatchForm({ type: 'SET_NAME', name: '' });
      dispatchForm({ type: 'SET_ACTIVE_TAB', tab: 'list' });
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('确定要删除此分类吗？')) {
      onDeleteCategory(id);
    }
  };

  const handleEditCategory = (category: Category) => {
    dispatchForm({ type: 'SET_EDITING_CATEGORY', category });
    dispatchForm({ type: 'SET_NAME', name: category.name });
    dispatchForm({ type: 'SET_COLOR', color: category.color });
    dispatchForm({ type: 'SET_ICON', icon: category.icon });
    dispatchForm({ type: 'SET_ACTIVE_TAB', tab: 'edit' });
  };

  const handleAddTasksToCategory = (categoryId: string) => {
    if (selectedTaskIds.length > 0 && onTasksAddedToCategory) {
      onTasksAddedToCategory(categoryId, selectedTaskIds);
      onClose();
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderCategoryList = () => (
    <div className="space-y-4">
      <div>
        <Input
          type="text"
          placeholder="搜索分类..."
          value={searchTerm}
          onChange={(e) => dispatchForm({ type: 'SET_SEARCH', term: e.target.value })}
        />
      </div>

      <div className="text-sm text-gray-500">
        共 {filteredCategories.length} 个分类
      </div>

      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="text-5xl mb-4">📂</span>
          <p className="text-sm mb-4">
            {searchTerm ? '未找到匹配的分类' : '暂无分类'}
          </p>
          {!searchTerm && (
            <Button onClick={() => dispatchForm({ type: 'SET_ACTIVE_TAB', tab: 'create' })}>
              创建第一个分类
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
          {filteredCategories.map(category => (
            <div
              key={category.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0"
                style={{ backgroundColor: category.color + '20' }}
              >
                {category.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">
                  {category.name}
                </div>
                <div className="text-xs text-gray-500">
                  {category.taskCount} 个任务
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleEditCategory(category)}
                      >
                        ✏️
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>编辑分类</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        🗑️
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>删除分类</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCategoryForm = (isEdit: boolean) => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="category-name">分类名称</Label>
        <Input
          id="category-name"
          type="text"
          value={newCategoryName}
          onChange={(e) => dispatchForm({ type: 'SET_NAME', name: e.target.value })}
          placeholder="输入分类名称"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>选择图标</Label>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_ICONS.map(icon => (
            <button
              key={icon}
              type="button"
              className={`w-12 h-12 rounded-lg text-2xl cursor-pointer transition-all duration-200 border-2 ${
                newCategoryIcon === icon
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-transparent bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => dispatchForm({ type: 'SET_ICON', icon })}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>选择颜色</Label>
        <div className="grid grid-cols-8 gap-2">
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              type="button"
              className={`w-12 h-12 rounded-lg cursor-pointer text-white font-bold text-base transition-all duration-200 border-3 ${
                newCategoryColor === color
                  ? 'border-gray-900 scale-110'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => dispatchForm({ type: 'SET_COLOR', color })}
            >
              {newCategoryColor === color && '✓'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>预览</Label>
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
            style={{ backgroundColor: newCategoryColor + '20' }}
          >
            {newCategoryIcon}
          </div>
          <div className="font-semibold text-gray-900 text-sm">
            {newCategoryName || '分类名称'}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => {
            dispatchForm({ type: 'SET_ACTIVE_TAB', tab: 'list' });
            dispatchForm({ type: 'SET_EDITING_CATEGORY', category: null });
            dispatchForm({ type: 'SET_NAME', name: '' });
          }}
        >
          取消
        </Button>
        <Button
          onClick={isEdit ? handleUpdateCategory : handleCreateCategory}
          disabled={!newCategoryName.trim()}
        >
          {isEdit ? '保存修改' : '创建分类'}
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
              分类管理
            </DialogTitle>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) => dispatchForm({ type: 'SET_ACTIVE_TAB', tab: value as 'list' | 'create' | 'edit' })}
            className="w-full mt-4"
          >
            <TabsList>
              <TabsTrigger value="list">📂 分类列表</TabsTrigger>
              <TabsTrigger value="create">➕ 创建分类</TabsTrigger>
            </TabsList>
          </Tabs>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {activeTab === 'list' && renderCategoryList()}
          {activeTab === 'create' && renderCategoryForm(false)}
          {activeTab === 'edit' && editingCategory && renderCategoryForm(true)}
        </div>

        {selectedTaskIds.length > 0 && (
          <>
            <Separator />
            <DialogFooter className="flex-col items-start sm:flex-row sm:justify-start gap-3 px-6 py-4 bg-gray-50">
              <div className="text-sm text-gray-500">
                已选择 {selectedTaskIds.length} 个任务
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(category => (
                  <Button
                    key={category.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddTasksToCategory(category.id)}
                    className="text-primary-600 border-primary-300 hover:bg-primary-50"
                  >
                    {category.icon} 添加到 {category.name}
                  </Button>
                ))}
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CategoryManager;
