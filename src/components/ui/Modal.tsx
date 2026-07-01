import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './shadcn/Dialog';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
  closeOnOverlay?: boolean;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  centered = true,
  closeOnOverlay = true,
  className = '',
}) => {
  const sizeClass = sizeClasses[size];

  const combinedClasses = [
    sizeClass,
    className,
  ].filter(Boolean).join(' ');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={combinedClasses}>
        {(title) && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogClose className="absolute right-4 top-4">
              <button aria-label="Close modal">✕</button>
            </DialogClose>
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

export default Modal;