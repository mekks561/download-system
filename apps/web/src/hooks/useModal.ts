import { useState, useCallback, useEffect, useRef } from 'react';

export interface ModalOptions {
  defaultOpen?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  preventScroll?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  trapFocus?: boolean;
}

export interface UseModalReturn {
  isOpen: boolean;
  isClosing: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
  overlayRef: React.RefObject<HTMLDivElement | null>;
}

export function useModal(options: ModalOptions = {}): UseModalReturn {
  const {
    defaultOpen = false,
    closeOnOverlayClick = true,
    closeOnEscape = true,
    preventScroll = true,
    onOpen,
    onClose,
    trapFocus = true
  } = options;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    if (isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement;
    setIsOpen(true);
    onOpen?.();
  }, [isOpen, onOpen]);

  const close = useCallback(() => {
    if (!isOpen) return;

    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      onClose?.();
      
      if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus();
      }
    }, 200);
  }, [isOpen, onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  useEffect(() => {
    if (isOpen && preventScroll) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, preventScroll]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, close]);

  useEffect(() => {
    if (!isOpen || !trapFocus || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen, trapFocus]);

  const handleOverlayClick = useCallback((e: MouseEvent) => {
    if (closeOnOverlayClick && e.target === overlayRef.current) {
      close();
    }
  }, [closeOnOverlayClick, close]);

  useEffect(() => {
    if (isOpen) {
      if (overlayRef.current) {
        overlayRef.current.onclick = handleOverlayClick;
      }
    }
  }, [isOpen, handleOverlayClick]);

  return {
    isOpen,
    isClosing,
    open,
    close,
    toggle,
    modalRef,
    overlayRef
  };
}

export interface UseConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger' | 'warning';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface UseAlertOptions {
  title?: string;
  message: string;
  variant?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface UsePromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}

export function useConfirmDialog() {
  const [dialog, setDialog] = useState<UseConfirmDialogOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const confirm = useCallback((options: UseConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || '确认操作',
        message: options.message,
        confirmText: options.confirmText || '确认',
        cancelText: options.cancelText || '取消',
        confirmVariant: options.confirmVariant || 'primary',
        onConfirm: async () => {
          setIsLoading(true);
          try {
            await options.onConfirm();
            resolve(true);
          } catch (error) {
            console.error('Confirm action failed:', error);
            resolve(false);
          } finally {
            setIsLoading(false);
            setIsOpen(false);
            setDialog(null);
          }
        },
        onCancel: () => {
          options.onCancel?.();
          resolve(false);
          setIsOpen(false);
          setDialog(null);
        }
      });
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    void dialog?.onConfirm();
  }, [dialog]);

  const handleCancel = useCallback(() => {
    dialog?.onCancel?.();
    setIsOpen(false);
    setDialog(null);
  }, [dialog]);

  return {
    dialog,
    isOpen,
    isLoading,
    confirm,
    handleConfirm,
    handleCancel
  };
}

export function useAlert() {
  const [alertData, setAlertData] = useState<UseAlertOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAlert = useCallback((options: UseAlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setAlertData({
        title: options.title || '',
        message: options.message,
        variant: options.variant || 'info',
        duration: options.duration ?? 3000
      });
      setIsOpen(true);

      const duration = options.duration ?? 3000;
      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsOpen(false);
          setAlertData(null);
          resolve();
        }, duration);
      } else {
        resolve();
      }
    });
  }, []);

  const close = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
    setAlertData(null);
  }, []);

  return {
    alert: showAlert,
    alertData,
    isOpen,
    close
  };
}

export function usePrompt() {
  const [prompt, setPrompt] = useState<UsePromptOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');

  const resolvePrompt = useCallback((_result: string | null) => {
    setIsOpen(false);
    setPrompt(null);
    setValue('');
  }, []);

  const promptFn = useCallback((options: UsePromptOptions): Promise<string | null> => {
    return new Promise((_resolve) => {
      setValue(options.defaultValue || '');
      setPrompt(options);
      setIsOpen(true);
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (!prompt) return;

    if (prompt.validate) {
      const error = prompt.validate(value);
      if (error) {
        console.error('Validation error:', error);
        return;
      }
    }

    prompt.onSubmit(value);
    resolvePrompt(value);
  }, [prompt, value, resolvePrompt]);

  const handleCancel = useCallback(() => {
    prompt?.onCancel?.();
    resolvePrompt(null);
  }, [prompt, resolvePrompt]);

  return {
    prompt,
    isOpen,
    value,
    setValue,
    showPrompt: promptFn,
    handleSubmit,
    handleCancel
  };
}

export interface UseMultipleModalsReturn<T extends string> {
  openModals: Set<T>;
  open: (modalId: T) => void;
  close: (modalId: T) => void;
  toggle: (modalId: T) => void;
  closeAll: () => void;
  isOpen: (modalId: T) => boolean;
  getRef: (modalId: T) => React.RefObject<HTMLDivElement | null>;
}

export function useMultipleModals<T extends string>(modalIds: T[]): UseMultipleModalsReturn<T> {
  const [openModals, setOpenModals] = useState<Set<T>>(() => new Set());
  const modalRef = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});

  modalIds.forEach(id => {
    if (!modalRef.current[id]) {
      modalRef.current[id] = { current: null };
    }
  });

  const open = useCallback((modalId: T) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.add(modalId);
      return newSet;
    });
  }, []);

  const close = useCallback((modalId: T) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  }, []);

  const toggle = useCallback((modalId: T) => {
    setOpenModals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modalId)) {
        newSet.delete(modalId);
      } else {
        newSet.add(modalId);
      }
      return newSet;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  const isOpen = useCallback((modalId: T) => {
    return openModals.has(modalId);
  }, [openModals]);

  return {
    openModals,
    open,
    close,
    toggle,
    closeAll,
    isOpen,
    getRef: (modalId: T) => modalRef.current[modalId]
  };
}

export default useModal;
