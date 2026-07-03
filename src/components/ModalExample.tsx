import React, { useState, useCallback } from 'react';
import { useModal, useConfirmDialog, usePrompt } from '../hooks/useModal';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, ScrollArea, Separator } from '../components/ui/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/shadcn';

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
  const getButtonVariant = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md transition-all ${isClosing ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>
          <DialogDescription className="text-base text-gray-500 leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={getButtonVariant()} 
            onClick={onConfirm} 
            disabled={isLoading}
            className={confirmVariant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
          >
            {isLoading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>
          {message && (
            <DialogDescription className="text-base text-gray-500 leading-relaxed">
              {message}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-4">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="h-12 text-base"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) {
                onSubmit();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            取消
          </Button>
          <Button 
            onClick={onSubmit} 
            disabled={isLoading || !value.trim()}
            className={!value.trim() && !isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isLoading ? '处理中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-lg transition-all ${isClosing ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
        <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <span className="text-xl leading-none">×</span>
          </Button>
        </DialogHeader>
        <div className="py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
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
    <div className="p-5 md:p-10 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-8 text-2xl md:text-3xl font-bold text-gray-900 text-center">
          🎯 useModal Hook 示例
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-4 border-b-2 border-primary-500">
              <CardTitle className="text-lg text-gray-900">基本模态框操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button onClick={modal1.open} className="w-full">
                  📂 打开模态框 1
                </Button>
                <Button onClick={modal2.toggle} variant="secondary" className="w-full bg-green-500 hover:bg-green-600 text-white">
                  🔄 切换模态框 2
                </Button>
                <Button onClick={modal3.open} variant="secondary" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  🚫 打开不可关闭的模态框
                </Button>
              </div>

              <div className="mt-5 p-4 bg-gray-50 rounded-lg text-sm leading-relaxed">
                <div className="mb-3 font-semibold text-primary-500">当前状态：</div>
                <div>模态框 1: <strong className={modal1.isOpen ? 'text-green-500' : 'text-red-500'}>{modal1.isOpen ? '打开' : '关闭'}</strong></div>
                <div>模态框 2: <strong className={modal2.isOpen ? 'text-green-500' : 'text-red-500'}>{modal2.isOpen ? '打开' : '关闭'}</strong></div>
                <div>模态框 3: <strong className={modal3.isOpen ? 'text-green-500' : 'text-red-500'}>{modal3.isOpen ? '打开' : '关闭'}</strong></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 border-b-2 border-primary-500">
              <CardTitle className="text-lg text-gray-900">确认对话框与输入框</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <Button onClick={() => void showConfirm({
                  title: '确认删除',
                  message: '确定要删除这个项目吗？此操作无法撤销。',
                  confirmText: '删除',
                  cancelText: '取消',
                  confirmVariant: 'danger',
                  onConfirm: handleDeleteConfirm
                })} variant="destructive" className="w-full">
                  🗑️ 删除确认
                </Button>
                <Button onClick={() => void showConfirm({
                  title: '危险操作警告',
                  message: '您正在执行危险操作，请确认您了解可能的风险。',
                  confirmText: '我了解风险',
                  cancelText: '取消',
                  confirmVariant: 'warning',
                  onConfirm: handleWarningConfirm
                })} variant="secondary" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                  ⚠️ 警告确认
                </Button>
                <Button onClick={() => void showConfirm({
                  title: '信息确认',
                  message: '是否继续执行此操作？',
                  confirmText: '继续',
                  cancelText: '返回',
                  confirmVariant: 'primary',
                  onConfirm: () => addLog('信息确认 - 已执行')
                })} className="w-full">
                  ℹ️ 普通确认
                </Button>
                <Button onClick={() => void showPrompt({
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
                })} variant="secondary" className="w-full bg-purple-500 hover:bg-purple-600 text-white">
                  ✏️ 显示输入框
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader className="pb-4 border-b-2 border-primary-500">
            <CardTitle className="text-lg text-gray-900">📋 操作日志</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] bg-gray-50 rounded-lg p-4 font-mono text-xs leading-relaxed">
              {logs.length === 0 ? (
                <div className="text-gray-400 text-center py-10">暂无操作日志</div>
              ) : (
                logs.map((log, index) => (
                  <div 
                    key={index}
                    className={`${index === logs.length - 1 ? 'text-primary-500 font-semibold' : 'text-gray-900'}`}
                  >
                    {log}
                  </div>
                ))
              )}
            </ScrollArea>
            
            {logs.length > 0 && (
              <Button variant="outline" onClick={() => setLogs([])} className="mt-3">
                清空日志
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 border-b-2 border-primary-500">
            <CardTitle className="text-lg text-gray-900">📚 Hook API 说明</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 text-sm leading-relaxed">
              <div>
                <h4 className="text-primary-500 mb-3 font-semibold">useModal Hook</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div className="mb-2">
                    <span className="font-semibold">选项：</span>
                  </div>
                  <div>• defaultOpen: 默认是否打开</div>
                  <div>• closeOnOverlayClick: 点击遮罩是否关闭</div>
                  <div>• closeOnEscape: 按ESC键是否关闭</div>
                  <div>• preventScroll: 打开时是否禁止页面滚动</div>
                  <div>• trapFocus: 是否捕获焦点在模态框内</div>
                  <div>• onOpen/onClose: 打开/关闭回调函数</div>
                  
                  <div className="mt-3 mb-2">
                    <span className="font-semibold">返回值：</span>
                  </div>
                  <div>• isOpen: 当前打开状态</div>
                  <div>• isClosing: 是否正在关闭动画</div>
                  <div>• open/close/toggle: 打开/关闭/切换方法</div>
                  <div>• modalRef/overlayRef: DOM引用</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-primary-500 mb-3 font-semibold">useConfirmDialog Hook</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div className="mb-2">
                    <span className="font-semibold">方法：</span>
                  </div>
                  <div>• confirm(options): 显示确认对话框，返回Promise</div>
                  
                  <div className="mt-3 mb-2">
                    <span className="font-semibold">选项：</span>
                  </div>
                  <div>• title: 对话框标题</div>
                  <div>• message: 确认消息内容</div>
                  <div>• confirmText/cancelText: 按钮文本</div>
                  <div>• confirmVariant: 确认按钮样式 ('primary'|'danger'|'warning')</div>
                  <div>• onConfirm/onCancel: 确认/取消回调</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-primary-500 mb-3 font-semibold">usePrompt Hook</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div className="mb-2">
                    <span className="font-semibold">方法：</span>
                  </div>
                  <div>• prompt(options): 显示输入对话框，返回Promise</div>
                  
                  <div className="mt-3 mb-2">
                    <span className="font-semibold">选项：</span>
                  </div>
                  <div>• title: 对话框标题</div>
                  <div>• message: 提示信息</div>
                  <div>• defaultValue: 默认值</div>
                  <div>• placeholder: 输入框占位符</div>
                  <div>• validate: 验证函数</div>
                  <div>• onSubmit/onCancel: 提交/取消回调</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-primary-500 mb-3 font-semibold">useMultipleModals Hook</h4>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
                  <div className="mb-2">
                    <span className="font-semibold">用途：</span>
                  </div>
                  <div>管理多个模态框的状态，支持同时打开多个模态框</div>
                  
                  <div className="mt-3 mb-2">
                    <span className="font-semibold">方法：</span>
                  </div>
                  <div>• open(id)/close(id)/toggle(id): 操作指定ID的模态框</div>
                  <div>• closeAll(): 关闭所有模态框</div>
                  <div>• isOpen(id): 检查指定模态框是否打开</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CustomModal
        isOpen={modal1.isOpen}
        isClosing={modal1.isClosing}
        onClose={modal1.close}
        title="模态框 1 - 基本示例"
      >
        <p className="mb-4 leading-relaxed text-gray-500">这是一个基本的模态框示例。您可以：</p>
        <ul className="mb-4 pl-6 text-gray-500 leading-relaxed">
          <li>点击背景遮罩关闭</li>
          <li>按ESC键关闭</li>
          <li>点击关闭按钮关闭</li>
        </ul>
        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-500">
          <strong>特性：</strong>
          <ul className="mt-2 pl-5">
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
        <p className="mb-4 leading-relaxed text-gray-500">这个模态框展示了更丰富的内容和交互：</p>
        
        <div className="grid gap-3 mb-5">
          <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <strong className="text-blue-500">提示信息</strong>
            <p className="mt-2 text-gray-500 text-sm">这是一条提示信息，用于向用户传达重要信息。</p>
          </div>
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <strong className="text-green-500">成功信息</strong>
            <p className="mt-2 text-gray-500 text-sm">操作已成功完成！</p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={modal2.close}>关闭</Button>
          <Button onClick={() => {
            addLog('模态框 2 - 确认按钮点击');
            modal2.close();
          }}>确认</Button>
        </div>
      </CustomModal>

      <CustomModal
        isOpen={modal3.isOpen}
        isClosing={modal3.isClosing}
        onClose={() => addLog('模态框 3 - 不能通过点击遮罩关闭')}
        title="模态框 3 - 不可关闭"
      >
        <p className="mb-4 leading-relaxed text-gray-500">这个模态框禁用了点击遮罩关闭功能。您只能：</p>
        <ul className="mb-4 pl-6 text-gray-500 leading-relaxed">
          <li>按ESC键关闭</li>
          <li>点击右上角的关闭按钮</li>
        </ul>
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded text-sm text-amber-800">
          <strong>注意：</strong>
          <p className="mt-2">此模态框适用于需要用户必须完成特定操作才能关闭的场景。</p>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <Button onClick={modal3.close}>我已知晓，关闭</Button>
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