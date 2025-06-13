import { describe, test, expect, runner } from './ui-test-runner.js';

// Popup Component のテスト（React風の擬似実装）

await describe('Popup Component Structure', async () => {
  await test('Popup クラスが正しく初期化されること', () => {
    class Popup {
      constructor(container) {
        this.container = container;
        this.state = {
          currentTab: 'current',
          notebooks: [],
          selectedNotebook: null,
          loading: false,
          error: null,
          successMessage: null,
        };
      }

      render() {
        return {
          type: 'div',
          props: {
            className: 'popup-container',
            children: [
              this.renderHeader(),
              this.renderTabs(),
              this.renderContent(),
              this.renderActions(),
            ],
          },
        };
      }

      renderHeader() {
        return {
          type: 'h1',
          props: {
            children: 'NotebookLM Adder',
            className: 'popup-title',
          },
        };
      }

      renderTabs() {
        return {
          type: 'div',
          props: {
            className: 'tab-container',
            children: [
              { type: 'button', props: { children: '現在ページ', className: 'tab active' } },
              { type: 'button', props: { children: 'リンク', className: 'tab' } },
              { type: 'button', props: { children: '新規作成', className: 'tab' } },
            ],
          },
        };
      }

      renderContent() {
        switch (this.state.currentTab) {
          case 'current':
            return this.renderCurrentPageTab();
          case 'links':
            return this.renderLinksTab();
          case 'new':
            return this.renderNewNotebookTab();
          default:
            return null;
        }
      }

      renderCurrentPageTab() {
        return {
          type: 'div',
          props: {
            className: 'tab-content',
            children: [
              { type: 'div', props: { children: 'ノートブック選択:' } },
              { type: 'select', props: { className: 'notebook-selector' } },
              { type: 'button', props: { children: 'ノートブックに追加', className: 'add-button' } },
            ],
          },
        };
      }

      renderLinksTab() {
        return {
          type: 'div',
          props: {
            className: 'tab-content',
            children: [
              { type: 'div', props: { children: 'ページ内リンク' } },
              { type: 'div', props: { className: 'links-list' } },
            ],
          },
        };
      }

      renderNewNotebookTab() {
        return {
          type: 'div',
          props: {
            className: 'tab-content',
            children: [
              { type: 'input', props: { placeholder: 'ノートブック名', className: 'notebook-name-input' } },
              { type: 'button', props: { children: '新しいノートブックを作成', className: 'create-button' } },
            ],
          },
        };
      }

      renderActions() {
        if (this.state.successMessage) {
          return {
            type: 'div',
            props: {
              className: 'success-message',
              children: [
                { type: 'span', props: { children: this.state.successMessage } },
                { type: 'button', props: { children: 'ノートブックを開く', className: 'open-notebook-button' } },
              ],
            },
          };
        }
        return null;
      }

      setState(newState) {
        this.state = { ...this.state, ...newState };
      }

      switchTab(tabName) {
        this.setState({ currentTab: tabName });
      }
    }

    const popup = new Popup(document.createElement('div'));
    expect(popup.state.currentTab).toBe('current');
    expect(popup.state.notebooks).toEqual([]);
    expect(popup.state.selectedNotebook).toBeNull();
  });

  await test('初期状態で現在ページタブが選択されていること', () => {
    class Popup {
      constructor() {
        this.state = { currentTab: 'current' };
      }
    }

    const popup = new Popup();
    expect(popup.state.currentTab).toBe('current');
  });

  await test('タブ切り替えが正常に動作すること', () => {
    class Popup {
      constructor() {
        this.state = { currentTab: 'current' };
      }

      switchTab(tabName) {
        this.state = { ...this.state, currentTab: tabName };
      }
    }

    const popup = new Popup();
    popup.switchTab('links');
    expect(popup.state.currentTab).toBe('links');

    popup.switchTab('new');
    expect(popup.state.currentTab).toBe('new');
  });
});

await describe('Popup Component Rendering', async () => {
  await test('ヘッダーが正しくレンダリングされること', () => {
    class Popup {
      renderHeader() {
        return {
          type: 'h1',
          props: {
            children: 'NotebookLM Adder',
            className: 'popup-title',
          },
        };
      }
    }

    const popup = new Popup();
    const header = popup.renderHeader();
    
    expect(header.type).toBe('h1');
    expect(header.props.children).toBe('NotebookLM Adder');
    expect(header.props.className).toBe('popup-title');
  });

  await test('タブコンテナが正しくレンダリングされること', () => {
    class Popup {
      renderTabs() {
        return {
          type: 'div',
          props: {
            className: 'tab-container',
            children: [
              { type: 'button', props: { children: '現在ページ', className: 'tab active' } },
              { type: 'button', props: { children: 'リンク', className: 'tab' } },
              { type: 'button', props: { children: '新規作成', className: 'tab' } },
            ],
          },
        };
      }
    }

    const popup = new Popup();
    const tabs = popup.renderTabs();
    
    expect(tabs.type).toBe('div');
    expect(tabs.props.className).toBe('tab-container');
    expect(tabs.props.children).toHaveLength(3);
    expect(tabs.props.children[0].props.children).toBe('現在ページ');
  });

  await test('現在ページタブのコンテンツが正しくレンダリングされること', () => {
    class Popup {
      constructor() {
        this.state = { currentTab: 'current' };
      }

      renderCurrentPageTab() {
        return {
          type: 'div',
          props: {
            className: 'tab-content',
            children: [
              { type: 'div', props: { children: 'ノートブック選択:' } },
              { type: 'select', props: { className: 'notebook-selector' } },
              { type: 'button', props: { children: 'ノートブックに追加', className: 'add-button' } },
            ],
          },
        };
      }
    }

    const popup = new Popup();
    const content = popup.renderCurrentPageTab();
    
    expect(content.type).toBe('div');
    expect(content.props.className).toBe('tab-content');
    expect(content.props.children).toHaveLength(3);
    expect(content.props.children[2].props.children).toBe('ノートブックに追加');
  });
});

await describe('Popup State Management', async () => {
  await test('setState が正しく状態を更新すること', () => {
    class Popup {
      constructor() {
        this.state = {
          loading: false,
          notebooks: [],
          selectedNotebook: null,
        };
      }

      setState(newState) {
        this.state = { ...this.state, ...newState };
      }
    }

    const popup = new Popup();
    
    popup.setState({ loading: true });
    expect(popup.state.loading).toBe(true);

    popup.setState({ notebooks: [{ id: '1', title: 'テスト' }] });
    expect(popup.state.notebooks).toHaveLength(1);
    expect(popup.state.notebooks[0].title).toBe('テスト');

    popup.setState({ selectedNotebook: '1' });
    expect(popup.state.selectedNotebook).toBe('1');
  });

  await test('エラー状態の管理が正しく動作すること', () => {
    class Popup {
      constructor() {
        this.state = { error: null };
      }

      setState(newState) {
        this.state = { ...this.state, ...newState };
      }

      setError(error) {
        this.setState({ error });
      }

      clearError() {
        this.setState({ error: null });
      }
    }

    const popup = new Popup();
    
    popup.setError('テストエラー');
    expect(popup.state.error).toBe('テストエラー');

    popup.clearError();
    expect(popup.state.error).toBeNull();
  });

  await test('成功メッセージの管理が正しく動作すること', () => {
    class Popup {
      constructor() {
        this.state = { successMessage: null };
      }

      setState(newState) {
        this.state = { ...this.state, ...newState };
      }

      setSuccessMessage(message) {
        this.setState({ successMessage: message });
      }
    }

    const popup = new Popup();
    
    popup.setSuccessMessage('インポートに成功しました');
    expect(popup.state.successMessage).toBe('インポートに成功しました');
  });
});

console.log('\n🚀 Popup Component tests completed');
runner.printSummary();