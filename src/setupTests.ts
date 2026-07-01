import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { vi, beforeEach, afterEach, describe, it, test, expect, beforeAll, afterAll } from 'vitest';

Object.assign(globalThis, { TextEncoder, TextDecoder });

interface JestMock {
  fn: typeof vi.fn;
  mock: typeof vi.mock;
  clearAllMocks: typeof vi.clearAllMocks;
  resetAllMocks: typeof vi.resetAllMocks;
  useFakeTimers: typeof vi.useFakeTimers;
  useRealTimers: typeof vi.useRealTimers;
  spyOn: typeof vi.spyOn;
  beforeEach: typeof beforeEach;
  afterEach: typeof afterEach;
  beforeAll: typeof beforeAll;
  afterAll: typeof afterAll;
  advanceTimersByTime: typeof vi.advanceTimersByTime;
  advanceTimersToNextTimer: typeof vi.advanceTimersToNextTimer;
  runAllTimers: typeof vi.runAllTimers;
  runOnlyPendingTimers: typeof vi.runOnlyPendingTimers;
}

const jestMock: JestMock = {
  fn: vi.fn.bind(vi),
  mock: vi.mock.bind(vi),
  clearAllMocks: vi.clearAllMocks.bind(vi),
  resetAllMocks: vi.resetAllMocks.bind(vi),
  useFakeTimers: vi.useFakeTimers.bind(vi),
  useRealTimers: vi.useRealTimers.bind(vi),
  spyOn: vi.spyOn.bind(vi),
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
  advanceTimersToNextTimer: vi.advanceTimersToNextTimer.bind(vi),
  runAllTimers: vi.runAllTimers.bind(vi),
  runOnlyPendingTimers: vi.runOnlyPendingTimers.bind(vi),
};

(globalThis as unknown as { jest: JestMock }).jest = jestMock;
(globalThis as unknown as { describe: typeof describe }).describe = describe;
(globalThis as unknown as { it: typeof it }).it = it;
(globalThis as unknown as { test: typeof test }).test = test;
(globalThis as unknown as { expect: typeof expect }).expect = expect;
(globalThis as unknown as { beforeEach: typeof beforeEach }).beforeEach = beforeEach;
(globalThis as unknown as { afterEach: typeof afterEach }).afterEach = afterEach;
(globalThis as unknown as { beforeAll: typeof beforeAll }).beforeAll = beforeAll;
(globalThis as unknown as { afterAll: typeof afterAll }).afterAll = afterAll;

class MockResizeObserver implements ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_callback: ResizeObserverCallback) {}
}

(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = MockResizeObserver;

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