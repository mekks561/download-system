import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@radix-ui/react-dialog';
import { Button } from './ui/shadcn/Button';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export const KeyboardShortcutsDialog: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          ⌨️ 快捷键
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle className="flex items-center gap-2">
          ⌨️ 键盘快捷键
        </DialogTitle>
        <DialogDescription>
          使用快捷键提高操作效率
        </DialogDescription>
        
        <div className="space-y-3 mt-4">
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <kbd className="px-3 py-1 bg-gray-200 rounded text-sm font-mono font-medium">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-gray-600">
                {shortcut.description}
              </span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => {}}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
