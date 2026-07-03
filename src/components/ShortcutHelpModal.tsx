import React, { useEffect } from 'react';
import { KeyboardShortcut } from '../hooks/useKeyboardShortcuts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/shadcn';
import { ScrollArea } from './ui/shadcn';
import { Separator } from './ui/shadcn';
import { Button } from './ui/shadcn';
import { Badge } from './ui/shadcn';

interface ShortcutHelpModalProps {
  shortcuts: KeyboardShortcut[];
  onClose: () => void;
}

const ShortcutHelpModal: React.FC<ShortcutHelpModalProps> = ({
  shortcuts,
  onClose,
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const formatShortcut = (shortcut: KeyboardShortcut) => {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');
    parts.push(shortcut.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-[500px] w-[90vw] max-h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              ⌨️ 键盘快捷键
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={onClose}
            >
              ×
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(80vh-140px)]">
          <div className="px-6 py-5">
            {shortcuts.map((shortcut, index) => (
              <div key={index}>
                <div className="flex justify-between items-center py-3">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {formatShortcut(shortcut)}
                  </Badge>
                  <div className="text-sm text-gray-500 font-medium">
                    {shortcut.description}
                  </div>
                </div>
                {index < shortcuts.length - 1 && (
                  <Separator className="bg-gray-100" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t border-gray-200 bg-gray-50 justify-center">
          <p className="text-sm text-gray-500 m-0">
            按{' '}
            <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono font-semibold">
              ?
            </kbd>{' '}
            或点击关闭
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ShortcutHelpModal };
export default ShortcutHelpModal;
