import type * as vitest from 'vitest';

declare global {
  const vi: typeof vitest.vi;
  namespace vi {
    export type Mock<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> = vitest.Mock<T>;
    export type MockInstance<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> = vitest.MockInstance<T>;
    export type MockedFunction<T extends (...args: unknown[]) => unknown = (...args: unknown[]) => unknown> = vitest.MockedFunction<T>;
    export type MockedClass<T extends abstract new (...args: unknown[]) => unknown = abstract new (...args: unknown[]) => unknown> = vitest.MockedClass<T>;
    export type MockedObject<T = unknown> = vitest.MockedObject<T>;
  }
  const describe: typeof vitest.describe;
  const test: typeof vitest.test;
  const it: typeof vitest.it;
  const expect: typeof vitest.expect;
  const beforeEach: typeof vitest.beforeEach;
  const afterEach: typeof vitest.afterEach;
  const beforeAll: typeof vitest.beforeAll;
  const afterAll: typeof vitest.afterAll;
}

export {};
