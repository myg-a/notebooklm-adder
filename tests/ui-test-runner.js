// UI Component 用の簡易テストランナー

class UITestRunner {
  constructor() {
    this.results = [];
    this.mockDOM();
  }

  mockDOM() {
    // 簡易DOM環境をセットアップ
    global.document = {
      createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        children: [],
        innerHTML: '',
        textContent: '',
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false,
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: (child) => {
          this.children = this.children || [];
          this.children.push(child);
        },
      }),
      getElementById: (id) => ({ id }),
      querySelector: (selector) => ({ selector }),
      querySelectorAll: (selector) => [],
    };

    global.window = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }

  async describe(name, testFn) {
    console.log(`\n🧪 ${name}`);
    try {
      await testFn();
      console.log(`✅ ${name} - All tests passed`);
    } catch (error) {
      console.log(`❌ ${name} - Tests failed:`, error.message);
    }
  }

  async test(name, testFn) {
    try {
      await testFn();
      this.results.push({ name, passed: true });
      console.log(`  ✅ ${name}`);
    } catch (error) {
      this.results.push({ name, passed: false, error });
      console.log(`  ❌ ${name}:`, error.message);
    }
  }

  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toContain: (expected) => {
        if (!actual || !actual.includes(expected)) {
          throw new Error(`Expected "${actual}" to contain "${expected}"`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected null, but got ${actual}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected truthy value, but got ${actual}`);
        }
      },
      toHaveLength: (length) => {
        if (!actual || actual.length !== length) {
          throw new Error(`Expected length ${length}, but got ${actual?.length || 'undefined'}`);
        }
      },
    };
  }

  mockChrome() {
    global.chrome = {
      tabs: {
        query: () => Promise.resolve([{
          title: 'Test Page',
          url: 'https://example.com',
        }]),
      },
      i18n: {
        getMessage: (key) => key,
      },
    };
  }

  printSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    console.log(`\n📊 UI Test Summary: ${passed}/${total} passed`);
    
    if (passed === total) {
      console.log('🎉 All UI tests passed!');
    } else {
      console.log('💥 Some UI tests failed');
    }
  }
}

const runner = new UITestRunner();
runner.mockChrome();

export const describe = runner.describe.bind(runner);
export const test = runner.test.bind(runner);
export const expect = runner.expect.bind(runner);
export { runner };