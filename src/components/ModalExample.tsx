import React, { useState, useCallback, useMemo } from 'react';
import { useModal, useConfirmDialog, usePrompt } from '../hooks/useModal';

const ConfirmationModal = React.memo(({ 
  isOpen, 
  isClosing, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = '确认', 
  cancelText = '取消',
  confirmVariant = 'primary',
  isLoading = false 
}: {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
  isLoading?: boolean;
}) => {
  if (!isOpen) return null;

  const variantColors = {
    primary: { bg: '#667eea', hover: '#5a67d8' },
    danger: { bg: '#e53e3e', hover: '#c53030' },
    warning: { bg: '#dd6b20', hover: '#c05621' }
  };

  const colors = variantColors[confirmVariant];

  return (
    <div
      style={{
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
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          transform: isClosing ? 'scale(0.9)' : 'scale(1)',
          transition: 'transform 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          marginBottom: '16px', 
          fontSize: '20px', 
          fontWeight: '600',
          color: '#333'
        }}>
          {title}
        </h2>
        
        <p style={{ 
          marginBottom: '24px', 
          fontSize: '15px', 
          lineHeight: '1.6',
          color: '#666'
        }}>
          {message}
        </p>

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.bg,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = colors.hover}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = colors.bg}
          >
            {isLoading ? '处理中...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
});

ConfirmationModal.displayName = 'ConfirmationModal';

const PromptModal = React.memo(({
  isOpen,
  onClose,
  onSubmit,
  onCancel,
  title,
  message,
  value,
  onChange,
  placeholder = '',
  isLoading = false
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onCancel: () => void;
  title: string;
  message?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          marginBottom: '12px', 
          fontSize: '20px', 
          fontWeight: '600',
          color: '#333'
        }}>
          {title}
        </h2>
        
        {message && (
          <p style={{ 
            marginBottom: '20px', 
            fontSize: '15px', 
            lineHeight: '1.6',
            color: '#666'
          }}>
            {message}
          </p>
        )}

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '15px',
            outline: 'none',
            marginBottom: '24px',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading) {
              onSubmit();
            }
          }}
        />

        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
            style={{
              padding: '10px 20px',
              backgroundColor: value.trim() ? '#667eea' : '#e0e0e0',
              color: value.trim() ? '#fff' : '#999',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: value.trim() && !isLoading ? 'pointer' : 'not-allowed'
            }}
          >
            {isLoading ? '处理中...' : '确认'}
          </button>
        </div>
      </div>
    </div>
  );
});

PromptModal.displayName = 'PromptModal';

const CustomModal = React.memo(({
  isOpen,
  isClosing,
  onClose,
  title,
  children
}: {
  isOpen: boolean;
  isClosing: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
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
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          transform: isClosing ? 'scale(0.9)' : 'scale(1)',
          transition: 'transform 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '2px solid #e0e0e0'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600',
            color: '#333',
            margin: 0
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
              padding: '4px 8px',
              lineHeight: 1
            }}
            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#333'}
            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#999'}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </div>
    </div>
  );
});

CustomModal.displayName = 'CustomModal';

const ModalExample: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const modal1 = useModal({
    closeOnOverlayClick: true,
    closeOnEscape: true,
    preventScroll: true,
    trapFocus: true,
    onOpen: () => addLog('模态框 1 已打开'),
    onClose: () => addLog('模态框 1 已关闭')
  });

  const modal2 = useModal({
    closeOnOverlayClick: true,
    closeOnEscape: true,
    preventScroll: true,
    trapFocus: true,
    onOpen: () => addLog('模态框 2 已打开'),
    onClose: () => addLog('模态框 2 已关闭')
  });

  const modal3 = useModal({
    closeOnOverlayClick: false,
    closeOnEscape: true,
    preventScroll: true,
    trapFocus: true,
    onOpen: () => addLog('模态框 3 (禁用点击遮罩关闭) 已打开'),
    onClose: () => addLog('模态框 3 已关闭')
  });

  const {
    dialog: confirmDialog,
    isOpen: isConfirmOpen,
    isLoading: isConfirmLoading,
    confirm: showConfirm,
    handleConfirm: handleConfirmAction,
    handleCancel: handleConfirmCancel
  } = useConfirmDialog();

  const {
    prompt: promptData,
    isOpen: isPromptOpen,
    value: promptValue,
    setValue: setPromptValue,
    showPrompt,
    handleSubmit: handlePromptSubmit,
    handleCancel: handlePromptCancel
  } = usePrompt();

  const handleDeleteConfirm = useCallback(async () => {
    addLog('删除确认 - 开始执行...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('删除确认 - 执行完成！');
  }, [addLog]);

  const handleWarningConfirm = useCallback(async () => {
    addLog('警告确认 - 开始执行...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('警告确认 - 执行完成！');
  }, [addLog]);

  const handlePromptSubmitAction = useCallback(() => {
    addLog(`输入框确认 - 输入值: "${promptValue}"`);
    handlePromptSubmit();
  }, [addLog, promptValue, handlePromptSubmit]);

  return (
    <div style={{ 
      padding: '40px', 
      backgroundColor: '#f5f5f5', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ 
          marginBottom: '32px', 
          fontSize: '32px', 
          fontWeight: '700', 
          color: '#1a1a2e',
          textAlign: 'center'
        }}>
          🎯 useModal Hook 示例
        </h1>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '20px', 
              fontSize: '20px', 
              color: '#333',
              borderBottom: '2px solid #667eea',
              paddingBottom: '12px'
            }}>
              基本模态框操作
            </h2>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                onClick={modal1.open}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#5a67d8'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#667eea'}
              >
                📂 打开模态框 1
              </button>

              <button
                onClick={modal2.toggle}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#48bb78',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🔄 切换模态框 2
              </button>

              <button
                onClick={modal3.open}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#ed8936',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🚫 打开不可关闭的模态框
              </button>
            </div>

            <div style={{ 
              marginTop: '20px', 
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '14px',
              lineHeight: '1.8'
            }}>
              <div style={{ marginBottom: '12px', fontWeight: '600', color: '#667eea' }}>
                当前状态：
              </div>
              <div>模态框 1: <strong style={{ color: modal1.isOpen ? '#48bb78' : '#e53e3e' }}>{modal1.isOpen ? '打开' : '关闭'}</strong></div>
              <div>模态框 2: <strong style={{ color: modal2.isOpen ? '#48bb78' : '#e53e3e' }}>{modal2.isOpen ? '打开' : '关闭'}</strong></div>
              <div>模态框 3: <strong style={{ color: modal3.isOpen ? '#48bb78' : '#e53e3e' }}>{modal3.isOpen ? '打开' : '关闭'}</strong></div>
            </div>
          </div>

          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '12px', 
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ 
              marginBottom: '20px', 
              fontSize: '20px', 
              color: '#333',
              borderBottom: '2px solid #667eea',
              paddingBottom: '12px'
            }}>
              确认对话框与输入框
            </h2>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                onClick={() => showConfirm({
                  title: '确认删除',
                  message: '确定要删除这个项目吗？此操作无法撤销。',
                  confirmText: '删除',
                  cancelText: '取消',
                  confirmVariant: 'danger',
                  onConfirm: handleDeleteConfirm
                })}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#e53e3e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                🗑️ 删除确认
              </button>

              <button
                onClick={() => showConfirm({
                  title: '危险操作警告',
                  message: '您正在执行危险操作，请确认您了解可能的风险。',
                  confirmText: '我了解风险',
                  cancelText: '取消',
                  confirmVariant: 'warning',
                  onConfirm: handleWarningConfirm
                })}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#dd6b20',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ⚠️ 警告确认
              </button>

              <button
                onClick={() => showConfirm({
                  title: '信息确认',
                  message: '是否继续执行此操作？',
                  confirmText: '继续',
                  cancelText: '返回',
                  confirmVariant: 'primary',
                  onConfirm: () => addLog('信息确认 - 已执行')
                })}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ℹ️ 普通确认
              </button>

              <button
                onClick={() => showPrompt({
                  title: '请输入名称',
                  message: '请输入新的项目名称：',
                  defaultValue: '',
                  placeholder: '输入名称...',
                  validate: (value: string) => {
                    if (!value.trim()) return '名称不能为空';
                    if (value.length < 2) return '名称至少需要2个字符';
                    if (value.length > 50) return '名称不能超过50个字符';
                    return null;
                  },
                  onSubmit: handlePromptSubmitAction,
                  onCancel: () => addLog('输入框 - 已取消')
                })}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#805ad5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ✏️ 显示输入框
              </button>
            </div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '12px', 
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            marginBottom: '20px', 
            fontSize: '20px', 
            color: '#333',
            borderBottom: '2px solid #667eea',
            paddingBottom: '12px'
          }}>
            📋 操作日志
          </h2>
          
          <div style={{ 
            height: '300px',
            overflow: 'auto',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.8'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: '#999', textAlign: 'center', padding: '40px' }}>
                暂无操作日志
              </div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={index}
                  style={{ 
                    color: index === logs.length - 1 ? '#667eea' : '#333',
                    fontWeight: index === logs.length - 1 ? '600' : '400'
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>
          
          {logs.length > 0 && (
            <button
              onClick={() => setLogs([])}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                backgroundColor: '#e0e0e0',
                color: '#333',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              清空日志
            </button>
          )}
        </div>

        <div style={{ 
          marginTop: '32px',
          padding: '24px',
          backgroundColor: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ 
            marginBottom: '16px', 
            fontSize: '20px', 
            color: '#333',
            borderBottom: '2px solid #667eea',
            paddingBottom: '12px'
          }}>
            📚 Hook API 说明
          </h3>
          
          <div style={{ 
            display: 'grid', 
            gap: '24px',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <div>
              <h4 style={{ color: '#667eea', marginBottom: '12px' }}>useModal Hook</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>选项：</strong>
                </div>
                <div>• defaultOpen: 默认是否打开</div>
                <div>• closeOnOverlayClick: 点击遮罩是否关闭</div>
                <div>• closeOnEscape: 按ESC键是否关闭</div>
                <div>• preventScroll: 打开时是否禁止页面滚动</div>
                <div>• trapFocus: 是否捕获焦点在模态框内</div>
                <div>• onOpen/onClose: 打开/关闭回调函数</div>
                
                <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                  <strong>返回值：</strong>
                </div>
                <div>• isOpen: 当前打开状态</div>
                <div>• isClosing: 是否正在关闭动画</div>
                <div>• open/close/toggle: 打开/关闭/切换方法</div>
                <div>• modalRef/overlayRef: DOM引用</div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#667eea', marginBottom: '12px' }}>useConfirmDialog Hook</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>方法：</strong>
                </div>
                <div>• confirm(options): 显示确认对话框，返回Promise</div>
                
                <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                  <strong>选项：</strong>
                </div>
                <div>• title: 对话框标题</div>
                <div>• message: 确认消息内容</div>
                <div>• confirmText/cancelText: 按钮文本</div>
                <div>• confirmVariant: 确认按钮样式 ('primary'|'danger'|'warning')</div>
                <div>• onConfirm/onCancel: 确认/取消回调</div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#667eea', marginBottom: '12px' }}>usePrompt Hook</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>方法：</strong>
                </div>
                <div>• prompt(options): 显示输入对话框，返回Promise</div>
                
                <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                  <strong>选项：</strong>
                </div>
                <div>• title: 对话框标题</div>
                <div>• message: 提示信息</div>
                <div>• defaultValue: 默认值</div>
                <div>• placeholder: 输入框占位符</div>
                <div>• validate: 验证函数</div>
                <div>• onSubmit/onCancel: 提交/取消回调</div>
              </div>
            </div>

            <div>
              <h4 style={{ color: '#667eea', marginBottom: '12px' }}>useMultipleModals Hook</h4>
              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '16px', 
                borderRadius: '8px',
                fontFamily: 'Monaco, Consolas, monospace',
                fontSize: '13px'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>用途：</strong>
                </div>
                <div>管理多个模态框的状态，支持同时打开多个模态框</div>
                
                <div style={{ marginTop: '12px', marginBottom: '8px' }}>
                  <strong>方法：</strong>
                </div>
                <div>• open(id)/close(id)/toggle(id): 操作指定ID的模态框</div>
                <div>• closeAll(): 关闭所有模态框</div>
                <div>• isOpen(id): 检查指定模态框是否打开</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomModal
        isOpen={modal1.isOpen}
        isClosing={modal1.isClosing}
        onClose={modal1.close}
        title="模态框 1 - 基本示例"
      >
        <p style={{ marginBottom: '16px', lineHeight: '1.6', color: '#666' }}>
          这是一个基本的模态框示例。您可以：
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '24px', color: '#666', lineHeight: '1.8' }}>
          <li>点击背景遮罩关闭</li>
          <li>按ESC键关闭</li>
          <li>点击关闭按钮关闭</li>
        </ul>
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>特性：</strong>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>✅ 防止页面滚动</li>
            <li>✅ 焦点捕获</li>
            <li>✅ 关闭动画</li>
            <li>✅ 背景聚焦</li>
          </ul>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={modal2.isOpen}
        isClosing={modal2.isClosing}
        onClose={modal2.close}
        title="模态框 2 - 内容丰富"
      >
        <p style={{ marginBottom: '16px', lineHeight: '1.6', color: '#666' }}>
          这个模态框展示了更丰富的内容和交互：
        </p>
        
        <div style={{ 
          display: 'grid', 
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '16px',
            backgroundColor: '#e6f7ff',
            borderLeft: '4px solid #1890ff',
            borderRadius: '4px'
          }}>
            <strong style={{ color: '#1890ff' }}>提示信息</strong>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              这是一条提示信息，用于向用户传达重要信息。
            </p>
          </div>

          <div style={{
            padding: '16px',
            backgroundColor: '#f6ffed',
            borderLeft: '4px solid #52c41a',
            borderRadius: '4px'
          }}>
            <strong style={{ color: '#52c41a' }}>成功信息</strong>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              操作已成功完成！
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={modal2.close}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e0e0e0',
              color: '#333',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            关闭
          </button>
          <button
            onClick={() => {
              addLog('模态框 2 - 确认按钮点击');
              modal2.close();
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            确认
          </button>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={modal3.isOpen}
        isClosing={modal3.isClosing}
        onClose={() => addLog('模态框 3 - 不能通过点击遮罩关闭')}
        title="模态框 3 - 不可关闭"
      >
        <p style={{ marginBottom: '16px', lineHeight: '1.6', color: '#666' }}>
          这个模态框禁用了点击遮罩关闭功能。您只能：
        </p>
        <ul style={{ marginBottom: '16px', paddingLeft: '24px', color: '#666', lineHeight: '1.8' }}>
          <li>按ESC键关闭</li>
          <li>点击右上角的关闭按钮</li>
        </ul>
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#fff7e6', 
          borderLeft: '4px solid #faad14',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#ad6800'
        }}>
          <strong>注意：</strong>
          <p style={{ margin: '8px 0 0 0' }}>
            此模态框适用于需要用户必须完成特定操作才能关闭的场景。
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button
            onClick={modal3.close}
            style={{
              padding: '10px 20px',
              backgroundColor: '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            我已知晓，关闭
          </button>
        </div>
      </CustomModal>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        isClosing={false}
        onClose={handleConfirmCancel}
        onConfirm={handleConfirmAction}
        title={confirmDialog?.title || '确认'}
        message={confirmDialog?.message || ''}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        confirmVariant={confirmDialog?.confirmVariant}
        isLoading={isConfirmLoading}
      />

      <PromptModal
        isOpen={isPromptOpen}
        onClose={handlePromptCancel}
        onSubmit={handlePromptSubmitAction}
        onCancel={handlePromptCancel}
        title={promptData?.title || '输入'}
        message={promptData?.message}
        value={promptValue}
        onChange={setPromptValue}
        placeholder={promptData?.placeholder}
      />
    </div>
  );
};

export default ModalExample;
