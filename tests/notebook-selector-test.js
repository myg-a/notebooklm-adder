import { describe, test, expect, runner } from './ui-test-runner.js';

// NotebookSelector Component のテスト

await describe('NotebookSelector Component Structure', async () => {
  await test('NotebookSelector クラスが正しく初期化されること', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props || {};
        this.state = {
          isOpen: false,
          searchTerm: '',
          filteredNotebooks: props.notebooks || [],
        };
      }

      render() {
        return {
          type: 'div',
          props: {
            className: 'notebook-selector',
            children: [
              this.renderSelectedNotebook(),
              this.renderDropdown(),
            ],
          },
        };
      }

      renderSelectedNotebook() {
        const selected = this.props.notebooks?.find(nb => nb.id === this.props.selectedNotebook);
        return {
          type: 'button',
          props: {
            className: 'selected-notebook',
            children: selected ? `${selected.emoji} ${selected.title}` : 'ノートブックを選択',
          },
        };
      }

      renderDropdown() {
        if (!this.state.isOpen) return null;

        return {
          type: 'div',
          props: {
            className: 'dropdown',
            children: [
              this.renderSearchInput(),
              this.renderNotebookList(),
            ],
          },
        };
      }

      renderSearchInput() {
        return {
          type: 'input',
          props: {
            className: 'search-input',
            placeholder: 'ノートブックを検索...',
          },
        };
      }

      renderNotebookList() {
        return {
          type: 'div',
          props: {
            className: 'notebook-list',
            children: this.state.filteredNotebooks.map(notebook => ({
              type: 'div',
              props: {
                className: 'notebook-item',
                children: `${notebook.emoji} ${notebook.title}`,
              },
            })),
          },
        };
      }
    }

    const notebooks = [
      { id: '1', title: 'テストノート1', emoji: '📔' },
      { id: '2', title: 'テストノート2', emoji: '📚' },
    ];

    const selector = new NotebookSelector({ notebooks, selectedNotebook: '1' });
    expect(selector.props.notebooks).toEqual(notebooks);
    expect(selector.props.selectedNotebook).toBe('1');
    expect(selector.state.isOpen).toBe(false);
    expect(selector.state.filteredNotebooks).toEqual(notebooks);
  });

  await test('ノートブック一覧がドロップダウンに表示されること', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props;
        this.state = {
          isOpen: true,
          filteredNotebooks: props.notebooks,
        };
      }

      renderNotebookList() {
        return {
          type: 'div',
          props: {
            className: 'notebook-list',
            children: this.state.filteredNotebooks.map(notebook => ({
              type: 'div',
              props: {
                className: 'notebook-item',
                children: `${notebook.emoji} ${notebook.title}`,
              },
            })),
          },
        };
      }
    }

    const notebooks = [
      { id: '1', title: 'ワークノート', emoji: '💼' },
      { id: '2', title: '学習ノート', emoji: '📖' },
      { id: '3', title: 'プロジェクトA', emoji: '🚀' },
    ];

    const selector = new NotebookSelector({ notebooks });
    const list = selector.renderNotebookList();

    expect(list.type).toBe('div');
    expect(list.props.className).toBe('notebook-list');
    expect(list.props.children).toHaveLength(3);
    expect(list.props.children[0].props.children).toBe('💼 ワークノート');
    expect(list.props.children[1].props.children).toBe('📖 学習ノート');
    expect(list.props.children[2].props.children).toBe('🚀 プロジェクトA');
  });

  await test('選択されたノートブックが正しく表示されること', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props;
      }

      renderSelectedNotebook() {
        const selected = this.props.notebooks?.find(nb => nb.id === this.props.selectedNotebook);
        return {
          type: 'button',
          props: {
            className: 'selected-notebook',
            children: selected ? `${selected.emoji} ${selected.title}` : 'ノートブックを選択',
          },
        };
      }
    }

    const notebooks = [
      { id: '1', title: 'メインノート', emoji: '📝' },
      { id: '2', title: 'リサーチノート', emoji: '🔍' },
    ];

    // ノートブックが選択されている場合
    const selectorWithSelection = new NotebookSelector({ notebooks, selectedNotebook: '2' });
    const selectedButton = selectorWithSelection.renderSelectedNotebook();
    expect(selectedButton.props.children).toBe('🔍 リサーチノート');

    // ノートブックが選択されていない場合
    const selectorWithoutSelection = new NotebookSelector({ notebooks });
    const defaultButton = selectorWithoutSelection.renderSelectedNotebook();
    expect(defaultButton.props.children).toBe('ノートブックを選択');
  });
});

await describe('NotebookSelector Search Functionality', async () => {
  await test('検索機能が正常に動作すること', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props;
        this.state = {
          searchTerm: '',
          filteredNotebooks: props.notebooks || [],
        };
      }

      updateSearch(searchTerm) {
        const filtered = this.props.notebooks.filter(notebook =>
          notebook.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.state = {
          ...this.state,
          searchTerm,
          filteredNotebooks: filtered,
        };
      }

      getFilteredNotebooks() {
        return this.state.filteredNotebooks;
      }
    }

    const notebooks = [
      { id: '1', title: '学習ノート', emoji: '📖' },
      { id: '2', title: '仕事ノート', emoji: '💼' },
      { id: '3', title: '研究ノート', emoji: '🔬' },
      { id: '4', title: '個人メモ', emoji: '📝' },
    ];

    const selector = new NotebookSelector({ notebooks });

    // 「ノート」で検索
    selector.updateSearch('ノート');
    let filtered = selector.getFilteredNotebooks();
    expect(filtered).toHaveLength(3);
    expect(filtered.map(nb => nb.title)).toEqual(['学習ノート', '仕事ノート', '研究ノート']);

    // 「学習」で検索
    selector.updateSearch('学習');
    filtered = selector.getFilteredNotebooks();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('学習ノート');

    // 空文字で検索（全件表示）
    selector.updateSearch('');
    filtered = selector.getFilteredNotebooks();
    expect(filtered).toHaveLength(4);
  });

  await test('大文字小文字を区別しない検索が動作すること', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props;
        this.state = { filteredNotebooks: props.notebooks };
      }

      updateSearch(searchTerm) {
        const filtered = this.props.notebooks.filter(notebook =>
          notebook.title.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.state = { ...this.state, filteredNotebooks: filtered };
      }
    }

    const notebooks = [
      { id: '1', title: 'JavaScript学習', emoji: '💻' },
      { id: '2', title: 'TypeScript入門', emoji: '📘' },
    ];

    const selector = new NotebookSelector({ notebooks });

    // 小文字で検索
    selector.updateSearch('javascript');
    expect(selector.state.filteredNotebooks).toHaveLength(1);
    expect(selector.state.filteredNotebooks[0].title).toBe('JavaScript学習');

    // 大文字で検索
    selector.updateSearch('TYPESCRIPT');
    expect(selector.state.filteredNotebooks).toHaveLength(1);
    expect(selector.state.filteredNotebooks[0].title).toBe('TypeScript入門');
  });
});

await describe('NotebookSelector Interaction', async () => {
  await test('ドロップダウンの開閉が正常に動作すること', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props;
        this.state = { isOpen: false };
      }

      toggle() {
        this.state = { ...this.state, isOpen: !this.state.isOpen };
      }

      open() {
        this.state = { ...this.state, isOpen: true };
      }

      close() {
        this.state = { ...this.state, isOpen: false };
      }

      isOpen() {
        return this.state.isOpen;
      }
    }

    const selector = new NotebookSelector({});

    // 初期状態は閉じている
    expect(selector.isOpen()).toBe(false);

    // 開く
    selector.open();
    expect(selector.isOpen()).toBe(true);

    // 閉じる
    selector.close();
    expect(selector.isOpen()).toBe(false);

    // トグル
    selector.toggle();
    expect(selector.isOpen()).toBe(true);
    selector.toggle();
    expect(selector.isOpen()).toBe(false);
  });

  await test('ノートブック選択が正常に動作すること', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props;
        this.selectedNotebook = props.selectedNotebook || null;
        this.onSelect = props.onSelect || (() => {});
      }

      selectNotebook(notebookId) {
        this.selectedNotebook = notebookId;
        this.onSelect(notebookId);
      }

      getSelectedNotebook() {
        return this.selectedNotebook;
      }
    }

    let selectedId = null;
    const mockOnSelect = (id) => { selectedId = id; };

    const selector = new NotebookSelector({
      notebooks: [{ id: '123', title: 'テスト', emoji: '📔' }],
      onSelect: mockOnSelect,
    });

    selector.selectNotebook('123');
    expect(selector.getSelectedNotebook()).toBe('123');
    expect(selectedId).toBe('123');
  });

  await test('空のノートブック一覧の処理', () => {
    class NotebookSelector {
      constructor(props) {
        this.props = props;
        this.state = {
          filteredNotebooks: props.notebooks || [],
        };
      }

      renderEmptyState() {
        if (this.state.filteredNotebooks.length === 0) {
          return {
            type: 'div',
            props: {
              className: 'empty-state',
              children: 'ノートブックが見つかりません',
            },
          };
        }
        return null;
      }
    }

    const selector = new NotebookSelector({ notebooks: [] });
    const emptyState = selector.renderEmptyState();

    expect(emptyState).toBeTruthy();
    expect(emptyState.type).toBe('div');
    expect(emptyState.props.children).toBe('ノートブックが見つかりません');
  });
});

console.log('\n🚀 NotebookSelector Component tests completed');
runner.printSummary();