import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Chrome API のモック
const mockChrome = {
  tabs: {
    query: vi.fn(),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    sendMessage: vi.fn(),
  },
  i18n: {
    getMessage: vi.fn((key: string) => key),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

// @ts-ignore
global.chrome = mockChrome;

// Fetch API のモック
global.fetch = vi.fn();