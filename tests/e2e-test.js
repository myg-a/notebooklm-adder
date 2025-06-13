import { describe, test, expect, runner } from './ui-test-runner.js';

// E2E テスト - 実際のユーザーシナリオ

await describe('End-to-End User Scenarios', async () => {
  await test('新規ユーザーが初回セットアップから記事インポートまで完了できること', async () => {
    // Step 1: 拡張機能初回起動
    let authTokenStored = null;
    let notebooksLoaded = false;
    let currentPageImported = false;

    // Mock Chrome APIs for complete E2E flow
    global.chrome = {
      storage: {
        local: {
          get: (keys) => {
            if (keys === 'authToken') {
              return Promise.resolve({ authToken: authTokenStored });
            }
            if (keys === 'userSettings') {
              return Promise.resolve({
                userSettings: {
                  autoAudioOverview: false,
                  excludeDomains: [],
                  maxLinksPerPage: 100,
                  defaultNotebook: null,
                }
              });
            }
            return Promise.resolve({});
          },
          set: (data) => {
            if (data.authToken) {
              authTokenStored = data.authToken;
            }
            return Promise.resolve();
          }
        }
      },
      tabs: {
        query: () => Promise.resolve([{
          id: 123,
          title: 'How to Build Chrome Extensions',
          url: 'https://developer.chrome.com/docs/extensions',
        }]),
      },
      runtime: {
        sendMessage: (message) => {
          if (message.action === 'getAuthToken') {
            return Promise.resolve({
              success: true,
              token: 'mock-auth-token-12345'
            });
          }
          return Promise.resolve({ success: true });
        }
      }
    };

    // Mock NotebookLM API responses
    global.fetch = async (url, options) => {
      if (url.includes('notebooklm.google.com/_/LabsTailwindUi/data/batchexecute')) {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        
        // List notebooks (initial load)
        if (Array.isArray(body) && body[0] === 'listNotebooks') {
          notebooksLoaded = true;
          return {
            ok: true,
            text: async () => ')]}\'\n' + JSON.stringify({
              notebooks: [
                { id: 'nb-1', name: 'Personal Research' },
                { id: 'nb-2', name: 'Work Projects' },
              ]
            }),
          };
        }
        
        // Add source (import current page)
        if (Array.isArray(body) && body[0] === 'CCqFvf') {
          currentPageImported = true;
          return {
            ok: true,
            text: async () => ')]}\'\n' + JSON.stringify({
              source: {
                id: 'src-new',
                url: body[2],
                title: body[3] || 'Imported Page',
              }
            }),
          };
        }
      }
      
      return { ok: false };
    };

    // Simulate user interaction flow
    class E2ETestApp {
      constructor() {
        this.state = {
          authToken: null,
          notebooks: [],
          selectedNotebook: null,
          currentTab: null,
        };
      }

      async initialize() {
        // Step 1: Get auth token
        const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
        expect(response.success).toBe(true);
        this.state.authToken = response.token;
        await chrome.storage.local.set({ authToken: response.token });
        
        // Step 2: Load current tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        this.state.currentTab = tabs[0];
        
        // Step 3: Load notebooks
        const notebooks = await this.loadNotebooks();
        this.state.notebooks = notebooks;
        
        return true;
      }

      async loadNotebooks() {
        const response = await fetch('https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute', {
          method: 'POST',
          body: JSON.stringify(['listNotebooks']),
        });
        const text = await response.text();
        const data = JSON.parse(text.substring(5));
        return data.notebooks;
      }

      async selectNotebook(notebookId) {
        this.state.selectedNotebook = notebookId;
        return true;
      }

      async importCurrentPage() {
        if (!this.state.selectedNotebook) {
          throw new Error('No notebook selected');
        }
        
        const response = await fetch('https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute', {
          method: 'POST',
          body: JSON.stringify([
            'CCqFvf',
            this.state.selectedNotebook,
            this.state.currentTab.url,
            this.state.currentTab.title,
          ]),
        });
        
        const text = await response.text();
        const data = JSON.parse(text.substring(5));
        return data.source;
      }
    }

    // Execute E2E test
    const app = new E2ETestApp();
    
    // Step 1: Initialize app
    const initialized = await app.initialize();
    expect(initialized).toBe(true);
    expect(authTokenStored).toBe('mock-auth-token-12345');
    expect(notebooksLoaded).toBe(true);
    
    // Step 2: User selects notebook
    await app.selectNotebook('nb-1');
    expect(app.state.selectedNotebook).toBe('nb-1');
    
    // Step 3: User imports current page
    const importResult = await app.importCurrentPage();
    expect(currentPageImported).toBe(true);
    expect(importResult.url).toBe('https://developer.chrome.com/docs/extensions');
    expect(importResult.title).toBe('How to Build Chrome Extensions');
  });

  await test('ユーザーがページ内リンクを複数選択して一括インポートできること', async () => {
    let importedSources = [];

    // Mock complex page with multiple links
    global.document = {
      querySelectorAll: (selector) => {
        if (selector === 'a[href]') {
          return [
            { href: 'https://example.com/article1', textContent: 'Introduction to React' },
            { href: 'https://example.com/article2', textContent: 'Advanced React Patterns' },
            { href: 'https://example.com/article3', textContent: 'React Performance Tips' },
            { href: 'https://github.com/facebook/react', textContent: 'React GitHub Repository' },
            { href: 'https://reactjs.org/docs', textContent: 'React Documentation' },
          ];
        }
        return [];
      }
    };

    global.chrome = {
      tabs: {
        query: () => Promise.resolve([{ id: 456 }]),
        sendMessage: (tabId, message) => {
          if (message.action === 'extractLinks') {
            // Simulate LinkExtractor processing
            const links = Array.from(document.querySelectorAll('a[href]')).map(link => ({
              url: link.href,
              title: link.textContent.trim(),
              domain: new URL(link.href).hostname,
            }));
            return Promise.resolve({ success: true, links });
          }
          return Promise.resolve({ success: false });
        }
      }
    };

    global.fetch = async (url, options) => {
      if (url.includes('notebooklm.google.com/_/LabsTailwindUi/data/batchexecute')) {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        
        if (Array.isArray(body) && body[0] === 'CCqFvf') {
          const source = {
            id: `src-${importedSources.length + 1}`,
            url: body[2],
            title: body[3],
          };
          importedSources.push(source);
          
          return {
            ok: true,
            text: async () => ')]}\'\n' + JSON.stringify({ source }),
          };
        }
      }
      return { ok: false };
    };

    class BulkImportApp {
      constructor() {
        this.selectedLinks = [];
        this.availableLinks = [];
      }

      async loadPageLinks() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'extractLinks' });
        if (response.success) {
          this.availableLinks = response.links;
        }
        return this.availableLinks;
      }

      selectLinks(urls) {
        this.selectedLinks = urls;
      }

      async importSelectedLinks(notebookId) {
        const results = [];
        for (const url of this.selectedLinks) {
          const link = this.availableLinks.find(l => l.url === url);
          if (link) {
            const response = await fetch('https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute', {
              method: 'POST',
              body: JSON.stringify(['CCqFvf', notebookId, link.url, link.title]),
            });
            const text = await response.text();
            const data = JSON.parse(text.substring(5));
            results.push(data.source);
          }
        }
        return results;
      }
    }

    // Execute bulk import test
    const app = new BulkImportApp();
    
    // Step 1: Load links from page
    const links = await app.loadPageLinks();
    expect(links).toHaveLength(5);
    expect(links[0].title).toBe('Introduction to React');
    expect(links[3].domain).toBe('github.com');
    
    // Step 2: User selects specific links
    app.selectLinks([
      'https://example.com/article1',
      'https://example.com/article3',
      'https://reactjs.org/docs',
    ]);
    expect(app.selectedLinks).toHaveLength(3);
    
    // Step 3: Import selected links
    const results = await app.importSelectedLinks('nb-work');
    expect(results).toHaveLength(3);
    expect(importedSources).toHaveLength(3);
    expect(importedSources[0].title).toBe('Introduction to React');
    expect(importedSources[1].title).toBe('React Performance Tips');
    expect(importedSources[2].title).toBe('React Documentation');
  });

  await test('エラーが発生した場合のユーザーエクスペリエンス', async () => {
    let errorShown = false;
    let retryAttempted = false;

    // Mock error scenarios
    global.chrome = {
      storage: {
        local: {
          get: () => Promise.resolve({}), // No auth token
        }
      },
      runtime: {
        sendMessage: (message) => {
          if (message.action === 'getAuthToken') {
            if (!retryAttempted) {
              return Promise.resolve({
                success: false,
                error: 'NotebookLM tab not found'
              });
            } else {
              return Promise.resolve({
                success: true,
                token: 'recovered-token'
              });
            }
          }
          return Promise.resolve({ success: false });
        }
      }
    };

    class ErrorHandlingApp {
      constructor() {
        this.errorState = null;
        this.isLoading = false;
      }

      async initialize() {
        this.isLoading = true;
        try {
          const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
          if (!response.success) {
            this.showError('認証に失敗しました。NotebookLMにログインして再試行してください。');
            return false;
          }
          this.isLoading = false;
          return true;
        } catch (error) {
          this.showError(`初期化エラー: ${error.message}`);
          this.isLoading = false;
          return false;
        }
      }

      showError(message) {
        this.errorState = message;
        errorShown = true;
      }

      async retry() {
        retryAttempted = true;
        this.errorState = null;
        return await this.initialize();
      }
    }

    // Test error handling flow
    const app = new ErrorHandlingApp();
    
    // Step 1: Initial attempt fails
    const firstAttempt = await app.initialize();
    expect(firstAttempt).toBe(false);
    expect(errorShown).toBe(true);
    expect(app.errorState).toContain('認証に失敗しました');
    
    // Step 2: User clicks retry
    const retryResult = await app.retry();
    expect(retryResult).toBe(true);
    expect(retryAttempted).toBe(true);
    expect(app.errorState).toBeNull();
  });

  await test('設定変更が次回起動時に反映されること', async () => {
    let storedSettings = {};

    global.chrome = {
      storage: {
        local: {
          get: (keys) => {
            if (keys === 'userSettings') {
              return Promise.resolve({ userSettings: storedSettings });
            }
            return Promise.resolve({});
          },
          set: (data) => {
            if (data.userSettings) {
              storedSettings = data.userSettings;
            }
            return Promise.resolve();
          }
        }
      }
    };

    class SettingsApp {
      constructor() {
        this.settings = {
          autoAudioOverview: false,
          excludeDomains: [],
          maxLinksPerPage: 100,
          defaultNotebook: null,
        };
      }

      async loadSettings() {
        const result = await chrome.storage.local.get('userSettings');
        if (result.userSettings) {
          this.settings = { ...this.settings, ...result.userSettings };
        }
        return this.settings;
      }

      async updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await chrome.storage.local.set({ userSettings: this.settings });
      }

      async saveSettings() {
        await chrome.storage.local.set({ userSettings: this.settings });
      }
    }

    // Test settings persistence
    const app1 = new SettingsApp();
    
    // Step 1: User changes settings
    await app1.updateSettings({
      autoAudioOverview: true,
      excludeDomains: ['spam.com', 'ads.example.com'],
      maxLinksPerPage: 50,
      defaultNotebook: 'nb-research',
    });

    expect(storedSettings.autoAudioOverview).toBe(true);
    expect(storedSettings.excludeDomains).toEqual(['spam.com', 'ads.example.com']);
    
    // Step 2: Simulate app restart (new instance)
    const app2 = new SettingsApp();
    const loadedSettings = await app2.loadSettings();
    
    expect(loadedSettings.autoAudioOverview).toBe(true);
    expect(loadedSettings.excludeDomains).toEqual(['spam.com', 'ads.example.com']);
    expect(loadedSettings.maxLinksPerPage).toBe(50);
    expect(loadedSettings.defaultNotebook).toBe('nb-research');
  });

  await test('フルワークフロー：記事発見→リンク抽出→ノートブック作成→一括インポート', async () => {
    const workflow = {
      notebookCreated: false,
      linksExtracted: false,
      bulkImportCompleted: false,
      createdNotebookId: null,
      importedCount: 0,
    };

    // Mock comprehensive workflow
    global.chrome = {
      tabs: {
        query: () => Promise.resolve([{
          id: 789,
          title: 'Top 10 JavaScript Libraries 2024',
          url: 'https://blog.example.com/js-libraries-2024',
        }]),
        sendMessage: (tabId, message) => {
          if (message.action === 'extractLinks') {
            workflow.linksExtracted = true;
            return Promise.resolve({
              success: true,
              links: [
                { url: 'https://reactjs.org', title: 'React', domain: 'reactjs.org' },
                { url: 'https://vuejs.org', title: 'Vue.js', domain: 'vuejs.org' },
                { url: 'https://svelte.dev', title: 'Svelte', domain: 'svelte.dev' },
                { url: 'https://angular.io', title: 'Angular', domain: 'angular.io' },
              ]
            });
          }
          return Promise.resolve({ success: false });
        }
      },
      storage: {
        local: {
          get: () => Promise.resolve({ authToken: 'workflow-token' }),
          set: () => Promise.resolve(),
        }
      }
    };

    global.fetch = async (url, options) => {
      if (url.includes('notebooklm.google.com/_/LabsTailwindUi/data/batchexecute')) {
        const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
        
        // Create new notebook
        if (Array.isArray(body) && body[0] === 'wXbhsf') {
          workflow.notebookCreated = true;
          workflow.createdNotebookId = 'nb-js-libraries';
          return {
            ok: true,
            text: async () => ')]}\'\n' + JSON.stringify({
              notebook: {
                id: 'nb-js-libraries',
                name: body[1] || 'JavaScript Libraries Research',
              }
            }),
          };
        }
        
        // Add sources (bulk import)
        if (Array.isArray(body) && body[0] === 'CCqFvf') {
          workflow.importedCount++;
          return {
            ok: true,
            text: async () => ')]}\'\n' + JSON.stringify({
              source: {
                id: `src-lib-${workflow.importedCount}`,
                url: body[2],
                title: body[3],
              }
            }),
          };
        }
      }
      return { ok: false };
    };

    class FullWorkflowApp {
      constructor() {
        this.currentTab = null;
        this.extractedLinks = [];
        this.selectedLinks = [];
        this.createdNotebook = null;
      }

      async discoverContent() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tabs[0];
        return this.currentTab;
      }

      async extractLinks() {
        const response = await chrome.tabs.sendMessage(this.currentTab.id, { action: 'extractLinks' });
        if (response.success) {
          this.extractedLinks = response.links;
        }
        return this.extractedLinks;
      }

      selectRelevantLinks() {
        // User selects framework links
        this.selectedLinks = this.extractedLinks.filter(link => 
          ['reactjs.org', 'vuejs.org', 'svelte.dev'].includes(link.domain)
        );
        return this.selectedLinks;
      }

      async createNotebook(name) {
        const response = await fetch('https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute', {
          method: 'POST',
          body: JSON.stringify(['wXbhsf', name]),
        });
        const text = await response.text();
        const data = JSON.parse(text.substring(5));
        this.createdNotebook = data.notebook;
        return this.createdNotebook;
      }

      async bulkImportLinks() {
        const results = [];
        for (const link of this.selectedLinks) {
          const response = await fetch('https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute', {
            method: 'POST',
            body: JSON.stringify(['CCqFvf', this.createdNotebook.id, link.url, link.title]),
          });
          const text = await response.text();
          const data = JSON.parse(text.substring(5));
          results.push(data.source);
        }
        workflow.bulkImportCompleted = true;
        return results;
      }
    }

    // Execute full workflow
    const app = new FullWorkflowApp();
    
    // Step 1: User discovers interesting article
    const currentTab = await app.discoverContent();
    expect(currentTab.title).toBe('Top 10 JavaScript Libraries 2024');
    
    // Step 2: Extract links from the article
    const links = await app.extractLinks();
    expect(workflow.linksExtracted).toBe(true);
    expect(links).toHaveLength(4);
    
    // Step 3: User selects relevant links
    const selectedLinks = app.selectRelevantLinks();
    expect(selectedLinks).toHaveLength(3);
    expect(selectedLinks.map(l => l.domain)).toEqual(['reactjs.org', 'vuejs.org', 'svelte.dev']);
    
    // Step 4: Create new notebook for this research
    const notebook = await app.createNotebook('Frontend Framework Comparison');
    expect(workflow.notebookCreated).toBe(true);
    expect(notebook.name).toBe('Frontend Framework Comparison');
    
    // Step 5: Import all selected links
    const importResults = await app.bulkImportLinks();
    expect(workflow.bulkImportCompleted).toBe(true);
    expect(workflow.importedCount).toBe(3);
    expect(importResults).toHaveLength(3);
  });
});

console.log('\n🚀 E2E tests completed');
runner.printSummary();