import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/shadcn';
import { Button } from './ui/shadcn';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
  loading = false
}) => {
  const typeConfig = {
    danger: {
      icon: '⚠️',
      iconBgClass: 'bg-red-50',
      buttonVariant: 'destructive' as const,
    },
    warning: {
      icon: '⚡',
      iconBgClass: 'bg-amber-50',
      buttonVariant: 'default' as const,
    },
    info: {
      icon: '💡',
      iconBgClass: 'bg-blue-50',
      buttonVariant: 'default' as const,
    }
  };

  const config = typeConfig[type];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="items-center pt-8 pb-4 px-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${config.iconBgClass}`}>
            <span className="text-3xl">{config.icon}</span>
          </div>
          <DialogTitle className="text-xl font-semibold text-gray-800 text-center">
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-gray-500 text-center px-6 pb-6">
          {message}
        </DialogDescription>
        <DialogFooter className="px-6 pb-6 pt-0 flex-row gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            disabled={loading}
            className="flex-1"
          >
            {loading ? '处理中...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;
