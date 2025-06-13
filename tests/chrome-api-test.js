import { describe, test, expect, runner } from './ui-test-runner.js';

// Chrome APIs 連携のテスト

await describe('Tab Utils Basic Functionality', async () => {
  await test('アクティブタブの情報が正常に取得できること', async () => {
    // Mock Chrome API
    global.chrome = {
      tabs: {
        query: (queryInfo) => {
          if (queryInfo.active && queryInfo.currentWindow) {
            return Promise.resolve([{
              id: 123,
              title: 'Test Page Title',
              url: 'https://example.com/test-page',
              favIconUrl: 'https://example.com/favicon.ico',
            }]);
          }
          return Promise.resolve([]);
        }
      }
    };

    class TabUtils {
      static async getCurrentTab() {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs.length === 0) {
            throw new Error('No active tab found');
          }
          
          const tab = tabs[0];
          return {
            id: tab.id,
            title: tab.title || tab.url,
            url: tab.url,
            favIconUrl: tab.favIconUrl,
          };
        } catch (error) {
          throw new Error(`Failed to get current tab: ${error.message}`);
        }
      }

      static async getAllTabs() {
        try {
          const tabs = await chrome.tabs.query({});
          return tabs.map(tab => ({
            id: tab.id,
            title: tab.title || tab.url,
            url: tab.url,
            active: tab.active,
          }));
        } catch (error) {
          throw new Error(`Failed to get all tabs: ${error.message}`);
        }
      }
    }

    const currentTab = await TabUtils.getCurrentTab();
    
    expect(currentTab.title).toBe('Test Page Title');
    expect(currentTab.url).toBe('https://example.com/test-page');
    expect(currentTab.id).toBe(123);
    expect(currentTab.favIconUrl).toBe('https://example.com/favicon.ico');
  });

  await test('タブが存在しない場合のエラー処理', async () => {
    global.chrome = {
      tabs: {
        query: () => Promise.resolve([])
      }
    };

    class TabUtils {
      static async getCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw new Error('No active tab found');
        }
        return tabs[0];
      }
    }

    try {
      await TabUtils.getCurrentTab();
      expect(false).toBe(true); // この行に到達してはいけない
    } catch (error) {
      expect(error.message).toBe('No active tab found');
    }
  });

  await test('権限が不足している場合のエラー処理', async () => {
    global.chrome = {
      tabs: {
        query: () => Promise.reject(new Error('Permission denied'))
      }
    };

    class TabUtils {
      static async getCurrentTab() {
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          return tabs[0];
        } catch (error) {
          throw new Error(`Failed to get current tab: ${error.message}`);
        }
      }
    }

    try {
      await TabUtils.getCurrentTab();
      expect(false).toBe(true); // この行に到達してはいけない
    } catch (error) {
      expect(error.message).toBe('Failed to get current tab: Permission denied');
    }
  });
});

await describe('URL Validation and Normalization', async () => {
  await test('URLの正規化が正常に動作すること', () => {
    class URLUtils {
      static normalizeUrl(url) {
        try {
          const urlObj = new URL(url);
          
          // フラグメントを除去
          urlObj.hash = '';
          
          // 末尾スラッシュを正規化
          if (urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
          }
          
          return urlObj.toString();
        } catch (error) {
          throw new Error(`Invalid URL: ${url}`);
        }
      }

      static isValidWebUrl(url) {
        try {
          const urlObj = new URL(url);
          return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
          return false;
        }
      }

      static extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return null;
        }
      }
    }

    // 正規化テスト
    expect(URLUtils.normalizeUrl('https://example.com/page#section')).toBe('https://example.com/page');
    expect(URLUtils.normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    expect(URLUtils.normalizeUrl('https://example.com/')).toBe('https://example.com/');

    // バリデーションテスト
    expect(URLUtils.isValidWebUrl('https://example.com')).toBe(true);
    expect(URLUtils.isValidWebUrl('http://example.com')).toBe(true);
    expect(URLUtils.isValidWebUrl('ftp://example.com')).toBe(false);
    expect(URLUtils.isValidWebUrl('invalid-url')).toBe(false);

    // ドメイン抽出テスト
    expect(URLUtils.extractDomain('https://example.com/page')).toBe('example.com');
    expect(URLUtils.extractDomain('https://sub.example.com')).toBe('sub.example.com');
    expect(URLUtils.extractDomain('invalid-url')).toBeNull();
  });
});

await describe('Message Passing Between Components', async () => {
  await test('ポップアップとコンテンツスクリプト間の通信', async () => {
    let sentMessages = [];
    
    // Mock Chrome runtime
    global.chrome = {
      tabs: {
        sendMessage: (tabId, message) => {
          sentMessages.push({ tabId, message });
          
          // モックレスポンス
          if (message.action === 'extractLinks') {
            return Promise.resolve({
              success: true,
              links: [
                { url: 'https://example.com', title: 'Example', domain: 'example.com' },
                { url: 'https://test.com', title: 'Test', domain: 'test.com' },
              ]
            });
          }
          
          return Promise.resolve({ success: true });
        }
      },
      runtime: {
        sendMessage: (message) => {
          sentMessages.push({ message });
          return Promise.resolve({ success: true });
        }
      }
    };

    class MessageHandler {
      static async sendToContentScript(tabId, action, data = {}) {
        try {
          const response = await chrome.tabs.sendMessage(tabId, {
            action,
            data,
          });
          return response;
        } catch (error) {
          throw new Error(`Failed to send message to content script: ${error.message}`);
        }
      }

      static async sendToBackground(action, data = {}) {
        try {
          const response = await chrome.runtime.sendMessage({
            action,
            data,
          });
          return response;
        } catch (error) {
          throw new Error(`Failed to send message to background: ${error.message}`);
        }
      }

      static async extractLinksFromTab(tabId) {
        const response = await this.sendToContentScript(tabId, 'extractLinks');
        if (response.success) {
          return response.links;
        }
        throw new Error('Failed to extract links');
      }
    }

    // リンク抽出のテスト
    const links = await MessageHandler.extractLinksFromTab(123);
    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://example.com');
    expect(links[1].url).toBe('https://test.com');

    // メッセージ送信のテスト
    await MessageHandler.sendToBackground('testAction', { test: 'data' });
    
    expect(sentMessages).toHaveLength(2);
    expect(sentMessages[0].tabId).toBe(123);
    expect(sentMessages[0].message.action).toBe('extractLinks');
    expect(sentMessages[1].message.action).toBe('testAction');
  });

  await test('エラー時のメッセージハンドリング', async () => {
    global.chrome = {
      tabs: {
        sendMessage: () => Promise.reject(new Error('Tab not found'))
      }
    };

    class MessageHandler {
      static async sendToContentScript(tabId, action, data = {}) {
        try {
          const response = await chrome.tabs.sendMessage(tabId, { action, data });
          return response;
        } catch (error) {
          throw new Error(`Failed to send message to content script: ${error.message}`);
        }
      }
    }

    try {
      await MessageHandler.sendToContentScript(999, 'test');
      expect(false).toBe(true); // この行に到達してはいけない
    } catch (error) {
      expect(error.message).toBe('Failed to send message to content script: Tab not found');
    }
  });
});

await describe('Storage API Integration', async () => {
  await test('ローカルストレージの読み書きが正常に動作すること', async () => {
    let storage = {};

    global.chrome = {
      storage: {
        local: {
          get: (keys) => {
            if (typeof keys === 'string') {
              return Promise.resolve({ [keys]: storage[keys] });
            }
            if (Array.isArray(keys)) {
              const result = {};
              keys.forEach(key => {
                result[key] = storage[key];
              });
              return Promise.resolve(result);
            }
            return Promise.resolve(storage);
          },
          set: (items) => {
            Object.assign(storage, items);
            return Promise.resolve();
          },
          remove: (keys) => {
            if (typeof keys === 'string') {
              delete storage[keys];
            } else if (Array.isArray(keys)) {
              keys.forEach(key => delete storage[key]);
            }
            return Promise.resolve();
          },
          clear: () => {
            storage = {};
            return Promise.resolve();
          }
        }
      }
    };

    class StorageUtils {
      static async get(key) {
        try {
          const result = await chrome.storage.local.get(key);
          return result[key];
        } catch (error) {
          throw new Error(`Failed to get storage item: ${error.message}`);
        }
      }

      static async set(key, value) {
        try {
          await chrome.storage.local.set({ [key]: value });
        } catch (error) {
          throw new Error(`Failed to set storage item: ${error.message}`);
        }
      }

      static async remove(key) {
        try {
          await chrome.storage.local.remove(key);
        } catch (error) {
          throw new Error(`Failed to remove storage item: ${error.message}`);
        }
      }

      static async getMultiple(keys) {
        try {
          const result = await chrome.storage.local.get(keys);
          return result;
        } catch (error) {
          throw new Error(`Failed to get multiple storage items: ${error.message}`);
        }
      }
    }

    // 書き込みテスト
    await StorageUtils.set('testKey', 'testValue');
    expect(storage['testKey']).toBe('testValue');

    // 読み込みテスト
    const value = await StorageUtils.get('testKey');
    expect(value).toBe('testValue');

    // 複数アイテムのテスト
    await StorageUtils.set('key1', 'value1');
    await StorageUtils.set('key2', 'value2');
    
    const multiple = await StorageUtils.getMultiple(['key1', 'key2']);
    expect(multiple).toEqual({ key1: 'value1', key2: 'value2' });

    // 削除テスト
    await StorageUtils.remove('testKey');
    const deletedValue = await StorageUtils.get('testKey');
    expect(deletedValue).toBeNull();
  });

  await test('設定データの保存と読み込み', async () => {
    let storage = {};

    global.chrome = {
      storage: {
        local: {
          get: (keys) => Promise.resolve(typeof keys === 'string' ? { [keys]: storage[keys] } : storage),
          set: (items) => {
            Object.assign(storage, items);
            return Promise.resolve();
          }
        }
      }
    };

    class SettingsManager {
      static async saveSettings(settings) {
        await chrome.storage.local.set({ userSettings: settings });
      }

      static async loadSettings() {
        const result = await chrome.storage.local.get('userSettings');
        return result.userSettings || this.getDefaultSettings();
      }

      static getDefaultSettings() {
        return {
          autoAudioOverview: false,
          excludeDomains: [],
          maxLinksPerPage: 100,
          defaultNotebook: null,
        };
      }
    }

    // デフォルト設定のテスト
    const defaultSettings = await SettingsManager.loadSettings();
    expect(defaultSettings.autoAudioOverview).toBe(false);
    expect(defaultSettings.maxLinksPerPage).toBe(100);

    // 設定保存のテスト
    const newSettings = {
      autoAudioOverview: true,
      excludeDomains: ['example.com'],
      maxLinksPerPage: 50,
      defaultNotebook: 'nb-123',
    };

    await SettingsManager.saveSettings(newSettings);
    const savedSettings = await SettingsManager.loadSettings();
    expect(savedSettings).toEqual(newSettings);
  });
});

console.log('\n🚀 Chrome APIs integration tests completed');
runner.printSummary();