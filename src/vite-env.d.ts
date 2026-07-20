/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

import type { vi as viType } from 'vitest';

declare global {
  const vi: typeof viType;
}