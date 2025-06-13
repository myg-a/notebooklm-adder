// 簡易テストランナー

interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
}

class SimpleTestRunner {
  private results: TestResult[] = [];

  async describe(name: string, testFn: () => void | Promise<void>) {
    console.log(`\n🧪 ${name}`);
    try {
      await testFn();
      console.log(`✅ ${name} - All tests passed`);
    } catch (error) {
      console.log(`❌ ${name} - Tests failed:`, error);
    }
  }

  async test(name: string, testFn: () => void | Promise<void>) {
    try {
      await testFn();
      this.results.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    } catch (error) {
      this.results.push({ name, passed: false, error: error as Error });
      console.log(`  ❌ ${name}:`, error);
    }
  }

  expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toBeInstanceOf: (constructor: any) => {
        if (!(actual instanceof constructor)) {
          throw new Error(`Expected instance of ${constructor.name}, but got ${typeof actual}`);
        }
      },
      toThrow: (message?: string) => {
        let threw = false;
        let thrownError: any;
        try {
          if (typeof actual === 'function') {
            actual();
          }
        } catch (error) {
          threw = true;
          thrownError = error;
        }
        if (!threw) {
          throw new Error('Expected function to throw, but it did not');
        }
        if (message && !thrownError.message.includes(message)) {
          throw new Error(`Expected error message to contain "${message}", but got "${thrownError.message}"`);
        }
      },
      toHaveLength: (length: number) => {
        if (!actual || actual.length !== length) {
          throw new Error(`Expected length ${length}, but got ${actual?.length || 'undefined'}`);
        }
      },
    };
  }

  beforeEach(fn: () => void) {
    // Mock implementation
    fn();
  }

  vi = {
    fn: () => ({
      mockResolvedValueOnce: () => ({}),
      mockRejectedValueOnce: () => ({}),
      mock: { calls: [] },
    }),
    clearAllMocks: () => {},
  };

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    console.log(`\n📊 Test Summary: ${passed}/${total} passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('💥 Some tests failed');
    }
  }
}

// グローバルに関数をエクスポート
const runner = new SimpleTestRunner();

export const describe = runner.describe.bind(runner);
export const test = runner.test.bind(runner);
export const expect = runner.expect.bind(runner);
export const beforeEach = runner.beforeEach.bind(runner);
export const vi = runner.vi;

// モックfetch
global.fetch = runner.vi.fn();