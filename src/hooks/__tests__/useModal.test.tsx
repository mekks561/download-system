﻿﻿import { renderHook, act } from '@testing-library/react';
import { useModal, useConfirmDialog, usePrompt, useMultipleModals } from '../useModal';

describe('useModal', () => {
  test('should initialize with default closed state', () => {
    const { result } = renderHook(() => useModal());
    
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isClosing).toBe(false);
  });

  test('should initialize with open state', () => {
    const { result } = renderHook(() => useModal({ defaultOpen: true }));
    
    expect(result.current.isOpen).toBe(true);
  });

  test('should open modal', () => {
    const { result } = renderHook(() => useModal());
    
    act(() => {
      result.current.open();
    });
    
    expect(result.current.isOpen).toBe(true);
  });

  test('should close modal', () => {
    const { result } = renderHook(() => useModal({ defaultOpen: true }));
    
    act(() => {
      result.current.close();
    });
    
    expect(result.current.isClosing).toBe(true);
    
    return new Promise(resolve => setTimeout(resolve, 250));
  });

  test('should toggle modal', () => {
    const { result } = renderHook(() => useModal());
    
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);
    
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isClosing).toBe(true);
  });

  test('should call onOpen callback', () => {
    const onOpen = vi.fn();
    const { result } = renderHook(() => useModal({ onOpen }));
    
    act(() => {
      result.current.open();
    });
    
    expect(onOpen).toHaveBeenCalled();
  });

  test('should call onClose callback', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useModal({ defaultOpen: true, onClose }));
    
    act(() => {
      result.current.close();
    });
    
    return new Promise(resolve => setTimeout(resolve, 250));
  });
});

describe('useConfirmDialog', () => {
  test('should initialize with closed state', () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    expect(result.current.isOpen).toBe(false);
    expect(result.current.dialog).toBe(null);
  });

  test('should show confirm dialog', async () => {
    const { result } = renderHook(() => useConfirmDialog());
    
    let confirmPromise: Promise<boolean>;
    
    await act(async () => {
      confirmPromise = result.current.confirm({
        title: 'Test',
        message: 'Are you sure?',
        onConfirm: vi.fn()
      });
    });
    
    expect(result.current.isOpen).toBe(true);
    expect(result.current.dialog?.title).toBe('Test');
    expect(result.current.dialog?.message).toBe('Are you sure?');
  });

  test('should handle confirm action', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmDialog());
    
    let confirmPromise: Promise<boolean>;
    
    await act(async () => {
      confirmPromise = result.current.confirm({
        title: 'Test',
        message: 'Are you sure?',
        onConfirm
      });
    });
    
    await act(async () => {
      result.current.handleConfirm();
    });
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(onConfirm).toHaveBeenCalled();
  });

  test('should handle cancel action', () => {
    const onCancel = vi.fn();
    const { result } = renderHook(() => useConfirmDialog());
    
    act(() => {
      result.current.confirm({
        title: 'Test',
        message: 'Are you sure?',
        onConfirm: vi.fn(),
        onCancel
      });
    });
    
    act(() => {
      result.current.handleCancel();
    });
    
    expect(onCancel).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });
});

describe('usePrompt', () => {
  test('should initialize with closed state', () => {
    const { result } = renderHook(() => usePrompt());
    
    expect(result.current.isOpen).toBe(false);
    expect(result.current.value).toBe('');
  });

  test('should show prompt dialog', async () => {
    const { result } = renderHook(() => usePrompt());
    
    await act(async () => {
      result.current.showPrompt({
        title: 'Enter name',
        message: 'Please enter your name',
        onSubmit: vi.fn()
      });
    });
    
    expect(result.current.isOpen).toBe(true);
    expect(result.current.prompt?.title).toBe('Enter name');
  });

  test('should update value', async () => {
    const { result } = renderHook(() => usePrompt());
    
    await act(async () => {
      result.current.showPrompt({
        title: 'Enter name',
        onSubmit: vi.fn()
      });
    });
    
    act(() => {
      result.current.setValue('John');
    });
    
    expect(result.current.value).toBe('John');
  });

  test('should handle cancel', () => {
    const onCancel = vi.fn();
    const { result } = renderHook(() => usePrompt());
    
    act(() => {
      result.current.showPrompt({
        title: 'Enter name',
        onSubmit: vi.fn(),
        onCancel
      });
    });
    
    act(() => {
      result.current.handleCancel();
    });
    
    expect(onCancel).toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.value).toBe('');
  });
});

describe('useMultipleModals', () => {
  test('should initialize with no open modals', () => {
    const { result } = renderHook(() => 
      useMultipleModals(['modal1', 'modal2', 'modal3'])
    );
    
    expect(result.current.openModals.size).toBe(0);
  });

  test('should open specific modal', () => {
    const { result } = renderHook(() => 
      useMultipleModals(['modal1', 'modal2'])
    );
    
    act(() => {
      result.current.open('modal1');
    });
    
    expect(result.current.isOpen('modal1')).toBe(true);
    expect(result.current.isOpen('modal2')).toBe(false);
  });

  test('should close specific modal', () => {
    const { result } = renderHook(() => 
      useMultipleModals(['modal1', 'modal2'])
    );
    
    act(() => {
      result.current.open('modal1');
      result.current.open('modal2');
    });
    
    act(() => {
      result.current.close('modal1');
    });
    
    expect(result.current.isOpen('modal1')).toBe(false);
    expect(result.current.isOpen('modal2')).toBe(true);
  });

  test('should toggle modal', () => {
    const { result } = renderHook(() => 
      useMultipleModals(['modal1'])
    );
    
    act(() => {
      result.current.toggle('modal1');
    });
    expect(result.current.isOpen('modal1')).toBe(true);
    
    act(() => {
      result.current.toggle('modal1');
    });
    expect(result.current.isOpen('modal1')).toBe(false);
  });

  test('should close all modals', () => {
    const { result } = renderHook(() => 
      useMultipleModals(['modal1', 'modal2', 'modal3'])
    );
    
    act(() => {
      result.current.open('modal1');
      result.current.open('modal2');
      result.current.open('modal3');
    });
    
    act(() => {
      result.current.closeAll();
    });
    
    expect(result.current.openModals.size).toBe(0);
  });
});