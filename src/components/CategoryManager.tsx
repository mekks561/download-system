import React, { useState, useEffect } from 'react';

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
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [newCategoryIcon, setNewCategoryIcon] = useState(PRESET_ICONS[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setActiveTab('list');
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryColor(PRESET_COLORS[0]);
      setNewCategoryIcon(PRESET_ICONS[0]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      onCreateCategory(newCategoryName.trim(), newCategoryColor, newCategoryIcon);
      setNewCategoryName('');
      setNewCategoryColor(PRESET_COLORS[0]);
      setNewCategoryIcon(PRESET_ICONS[0]);
      setActiveTab('list');
    }
  };

  const handleUpdateCategory = () => {
    if (editingCategory && newCategoryName.trim()) {
      onUpdateCategory(editingCategory.id, newCategoryName.trim(), newCategoryColor, newCategoryIcon);
      setEditingCategory(null);
      setNewCategoryName('');
      setActiveTab('list');
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('确定要删除此分类吗？')) {
      onDeleteCategory(id);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryColor(category.color);
    setNewCategoryIcon(category.icon);
    setActiveTab('edit');
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

  if (!isOpen) return null;

  const renderCategoryList = () => (
    <div style={styles.categoryList}>
      <div style={styles.searchContainer}>
        <input
          type="text"
          style={styles.searchInput}
          placeholder="搜索分类..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={styles.categoryCount}>
        共 {filteredCategories.length} 个分类
      </div>

      {filteredCategories.length === 0 ? (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>📂</span>
          <p style={styles.emptyText}>
            {searchTerm ? '未找到匹配的分类' : '暂无分类'}
          </p>
          {!searchTerm && (
            <button
              style={styles.createFirstButton}
              onClick={() => setActiveTab('create')}
            >
              创建第一个分类
            </button>
          )}
        </div>
      ) : (
        <div style={styles.categories}>
          {filteredCategories.map(category => (
            <div key={category.id} style={styles.categoryItem}>
              <div
                style={{
                  ...styles.categoryIcon,
                  backgroundColor: category.color + '20',
                }}
              >
                {category.icon}
              </div>
              <div style={styles.categoryInfo}>
                <div style={styles.categoryName}>{category.name}</div>
                <div style={styles.categoryMeta}>
                  {category.taskCount} 个任务
                </div>
              </div>
              <div style={styles.categoryActions}>
                <button
                  style={styles.editButton}
                  onClick={() => handleEditCategory(category)}
                  title="编辑分类"
                >
                  ✏️
                </button>
                <button
                  style={styles.deleteButton}
                  onClick={() => handleDeleteCategory(category.id)}
                  title="删除分类"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCategoryForm = (isEdit: boolean) => (
    <div style={styles.form}>
      <div style={styles.formGroup}>
        <label style={styles.label}>分类名称</label>
        <input
          type="text"
          style={styles.input}
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="输入分类名称"
          autoFocus
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>选择图标</label>
        <div style={styles.iconGrid}>
          {PRESET_ICONS.map(icon => (
            <button
              key={icon}
              style={{
                ...styles.iconButton,
                ...(newCategoryIcon === icon ? styles.iconButtonSelected : {}),
              }}
              onClick={() => setNewCategoryIcon(icon)}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>选择颜色</label>
        <div style={styles.colorGrid}>
          {PRESET_COLORS.map(color => (
            <button
              key={color}
              style={{
                ...styles.colorButton,
                backgroundColor: color,
                ...(newCategoryColor === color ? styles.colorButtonSelected : {}),
              }}
              onClick={() => setNewCategoryColor(color)}
            >
              {newCategoryColor === color && '✓'}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>预览</label>
        <div style={styles.preview}>
          <div
            style={{
              ...styles.previewIcon,
              backgroundColor: newCategoryColor + '20',
            }}
          >
            {newCategoryIcon}
          </div>
          <div style={styles.previewName}>
            {newCategoryName || '分类名称'}
          </div>
        </div>
      </div>

      <div style={styles.formActions}>
        <button
          style={styles.cancelButton}
          onClick={() => {
            setActiveTab('list');
            setEditingCategory(null);
            setNewCategoryName('');
          }}
        >
          取消
        </button>
        <button
          style={styles.saveButton}
          onClick={isEdit ? handleUpdateCategory : handleCreateCategory}
          disabled={!newCategoryName.trim()}
        >
          {isEdit ? '保存修改' : '创建分类'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerTabs}>
            <button
              style={{
                ...styles.headerTab,
                ...(activeTab === 'list' ? styles.headerTabActive : {}),
              }}
              onClick={() => setActiveTab('list')}
            >
              📂 分类列表
            </button>
            <button
              style={{
                ...styles.headerTab,
                ...(activeTab === 'create' ? styles.headerTabActive : {}),
              }}
              onClick={() => setActiveTab('create')}
            >
              ➕ 创建分类
            </button>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          {activeTab === 'list' && renderCategoryList()}
          {activeTab === 'create' && renderCategoryForm(false)}
          {activeTab === 'edit' && editingCategory && renderCategoryForm(true)}
        </div>

        {selectedTaskIds.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.footerInfo}>
              已选择 {selectedTaskIds.length} 个任务
            </div>
            <div style={styles.footerActions}>
              {categories.map(category => (
                <button
                  key={category.id}
                  style={styles.addToCategoryButton}
                  onClick={() => handleAddTasksToCategory(category.id)}
                >
                  {category.icon} 添加到 {category.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '600px',
    maxWidth: '90vw',
    maxHeight: '80vh',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  headerTabs: {
    display: 'flex',
    gap: '8px',
  },
  headerTab: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  headerTabActive: {
    backgroundColor: 'white',
    color: '#3b82f6',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#fee',
    color: '#ef4444',
    border: 'none',
    borderRadius: '8px',
    fontSize: '24px',
    lineHeight: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  categoryList: {},
  searchContainer: {
    marginBottom: '16px',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  categoryCount: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    margin: '0 0 16px 0',
    fontSize: '14px',
  },
  createFirstButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  categories: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  categoryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    transition: 'background-color 0.2s',
  },
  categoryIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  categoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '4px',
  },
  categoryMeta: {
    fontSize: '12px',
    color: '#6b7280',
  },
  categoryActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    width: '32px',
    height: '32px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  deleteButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#fee',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  form: {},
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '8px',
  },
  iconButton: {
    width: '48px',
    height: '48px',
    backgroundColor: '#f3f4f6',
    border: '2px solid transparent',
    borderRadius: '8px',
    fontSize: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  iconButtonSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    gap: '8px',
  },
  colorButton: {
    width: '48px',
    height: '48px',
    border: '3px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    color: 'white',
    fontWeight: 'bold',
    transition: 'all 0.2s',
  },
  colorButtonSelected: {
    borderColor: '#1a1a2e',
    transform: 'scale(1.1)',
  },
  preview: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  previewIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  previewName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a2e',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  footerInfo: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  footerActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  addToCategoryButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default CategoryManager;
