import { expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// vitest 4 下 @testing-library/jest-dom/vitest 副作用导入的 expect.extend 不生效，需显式注册
// 上方 import 仅用于加载 jest-dom 的 TypeScript 类型声明（Assertion 接口增强）
expect.extend(matchers);

import { TextEncoder, TextDecoder } from 'util';

Object.assign(globalThis, { TextEncoder, TextDecoder });

class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: ResizeObserverCallback) {}
}

(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = MockResizeObserver;

Element.prototype.scrollIntoView = vi.fn();

const storage: Record<string, string> = {};

interface StorageMock {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
}

const storageMock: StorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete storage[key]; }),
  clear: vi.fn(() => { Object.keys(storage).forEach(key => delete storage[key]); }),
};

(window as unknown as { localStorage: StorageMock }).localStorage = storageMock;
(window as unknown as { sessionStorage: StorageMock }).sessionStorage = storageMock;