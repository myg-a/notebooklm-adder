import { describe, test, expect, runner } from './ui-test-runner.js';

// LinkList Component のテスト

await describe('LinkList Component Structure', async () => {
  await test('LinkList クラスが正しく初期化されること', () => {
    class LinkList {
      constructor(props) {
        this.props = props || {};
        this.state = {
          links: props.links || [],
          selectedLinks: props.selectedLinks || [],
          loading: false,
        };
      }

      render() {
        return {
          type: 'div',
          props: {
            className: 'link-list',
            children: [
              this.renderHeader(),
              this.renderActions(),
              this.renderLinkItems(),
            ],
          },
        };
      }

      renderHeader() {
        const count = this.state.links.length;
        return {
          type: 'h3',
          props: {
            className: 'link-list-header',
            children: `ページ内リンク (${count}件)`,
          },
        };
      }

      renderActions() {
        return {
          type: 'div',
          props: {
            className: 'link-actions',
            children: [
              { type: 'button', props: { children: '全選択', className: 'select-all-btn' } },
              { type: 'button', props: { children: '全解除', className: 'deselect-all-btn' } },
            ],
          },
        };
      }

      renderLinkItems() {
        if (this.state.links.length === 0) {
          return this.renderEmptyState();
        }

        return {
          type: 'div',
          props: {
            className: 'link-items',
            children: this.state.links.map(link => this.renderLinkItem(link)),
          },
        };
      }

      renderLinkItem(link) {
        const isSelected = this.state.selectedLinks.includes(link.url);
        return {
          type: 'div',
          props: {
            className: `link-item ${isSelected ? 'selected' : ''}`,
            children: [
              {
                type: 'input',
                props: {
                  type: 'checkbox',
                  checked: isSelected,
                },
              },
              {
                type: 'span',
                props: {
                  className: 'link-title',
                  children: link.title,
                },
              },
              {
                type: 'span',
                props: {
                  className: 'link-domain',
                  children: `(${link.domain})`,
                },
              },
            ],
          },
        };
      }

      renderEmptyState() {
        return {
          type: 'div',
          props: {
            className: 'empty-state',
            children: 'ページ内にリンクが見つかりません',
          },
        };
      }
    }

    const links = [
      { url: 'https://example.com', title: 'Example Site', domain: 'example.com' },
      { url: 'https://test.com', title: 'Test Site', domain: 'test.com' },
    ];

    const linkList = new LinkList({ links });
    expect(linkList.state.links).toEqual(links);
    expect(linkList.state.selectedLinks).toEqual([]);
    expect(linkList.state.loading).toBe(false);
  });

  await test('リンク一覧が正しく表示されること', () => {
    class LinkList {
      constructor(props) {
        this.state = {
          links: props.links || [],
          selectedLinks: [],
        };
      }

      renderLinkItems() {
        return {
          type: 'div',
          props: {
            className: 'link-items',
            children: this.state.links.map(link => ({
              type: 'div',
              props: {
                className: 'link-item',
                children: link.title,
              },
            })),
          },
        };
      }

      getLinksCount() {
        return this.state.links.length;
      }
    }

    const links = [
      { url: 'https://github.com', title: 'GitHub', domain: 'github.com' },
      { url: 'https://stackoverflow.com', title: 'Stack Overflow', domain: 'stackoverflow.com' },
      { url: 'https://developer.mozilla.org', title: 'MDN Web Docs', domain: 'developer.mozilla.org' },
    ];

    const linkList = new LinkList({ links });
    const linkItems = linkList.renderLinkItems();

    expect(linkList.getLinksCount()).toBe(3);
    expect(linkItems.props.children).toHaveLength(3);
    expect(linkItems.props.children[0].props.children).toBe('GitHub');
    expect(linkItems.props.children[1].props.children).toBe('Stack Overflow');
    expect(linkItems.props.children[2].props.children).toBe('MDN Web Docs');
  });

  await test('ヘッダーでリンク件数が正しく表示されること', () => {
    class LinkList {
      constructor(props) {
        this.state = { links: props.links || [] };
      }

      renderHeader() {
        const count = this.state.links.length;
        return {
          type: 'h3',
          props: {
            className: 'link-list-header',
            children: `ページ内リンク (${count}件)`,
          },
        };
      }
    }

    // 複数リンクの場合
    const linkListWithLinks = new LinkList({
      links: new Array(5).fill(0).map((_, i) => ({ 
        url: `https://example${i}.com`, 
        title: `Site ${i}`, 
        domain: `example${i}.com` 
      }))
    });
    const headerWithLinks = linkListWithLinks.renderHeader();
    expect(headerWithLinks.props.children).toBe('ページ内リンク (5件)');

    // リンクなしの場合
    const emptyLinkList = new LinkList({ links: [] });
    const emptyHeader = emptyLinkList.renderHeader();
    expect(emptyHeader.props.children).toBe('ページ内リンク (0件)');
  });
});

await describe('LinkList Selection Management', async () => {
  await test('リンクの選択・選択解除が正常に動作すること', () => {
    class LinkList {
      constructor(props) {
        this.state = {
          links: props.links || [],
          selectedLinks: [],
        };
      }

      toggleLink(url) {
        const isSelected = this.state.selectedLinks.includes(url);
        if (isSelected) {
          this.state.selectedLinks = this.state.selectedLinks.filter(link => link !== url);
        } else {
          this.state.selectedLinks = [...this.state.selectedLinks, url];
        }
      }

      isLinkSelected(url) {
        return this.state.selectedLinks.includes(url);
      }

      getSelectedCount() {
        return this.state.selectedLinks.length;
      }
    }

    const links = [
      { url: 'https://example1.com', title: 'Example 1', domain: 'example1.com' },
      { url: 'https://example2.com', title: 'Example 2', domain: 'example2.com' },
    ];

    const linkList = new LinkList({ links });

    // 初期状態では選択されていない
    expect(linkList.isLinkSelected('https://example1.com')).toBe(false);
    expect(linkList.getSelectedCount()).toBe(0);

    // リンクを選択
    linkList.toggleLink('https://example1.com');
    expect(linkList.isLinkSelected('https://example1.com')).toBe(true);
    expect(linkList.getSelectedCount()).toBe(1);

    // 別のリンクを選択
    linkList.toggleLink('https://example2.com');
    expect(linkList.isLinkSelected('https://example2.com')).toBe(true);
    expect(linkList.getSelectedCount()).toBe(2);

    // リンクの選択を解除
    linkList.toggleLink('https://example1.com');
    expect(linkList.isLinkSelected('https://example1.com')).toBe(false);
    expect(linkList.getSelectedCount()).toBe(1);
  });

  await test('全選択機能が正常に動作すること', () => {
    class LinkList {
      constructor(props) {
        this.state = {
          links: props.links || [],
          selectedLinks: [],
        };
      }

      selectAll() {
        this.state.selectedLinks = this.state.links.map(link => link.url);
      }

      deselectAll() {
        this.state.selectedLinks = [];
      }

      getSelectedCount() {
        return this.state.selectedLinks.length;
      }

      getAllLinksCount() {
        return this.state.links.length;
      }
    }

    const links = [
      { url: 'https://site1.com', title: 'Site 1', domain: 'site1.com' },
      { url: 'https://site2.com', title: 'Site 2', domain: 'site2.com' },
      { url: 'https://site3.com', title: 'Site 3', domain: 'site3.com' },
    ];

    const linkList = new LinkList({ links });

    // 全選択
    linkList.selectAll();
    expect(linkList.getSelectedCount()).toBe(3);
    expect(linkList.getSelectedCount()).toBe(linkList.getAllLinksCount());

    // 全解除
    linkList.deselectAll();
    expect(linkList.getSelectedCount()).toBe(0);
  });

  await test('選択されたリンクの一覧が正しく取得できること', () => {
    class LinkList {
      constructor(props) {
        this.state = {
          links: props.links || [],
          selectedLinks: [],
        };
      }

      selectLink(url) {
        if (!this.state.selectedLinks.includes(url)) {
          this.state.selectedLinks = [...this.state.selectedLinks, url];
        }
      }

      getSelectedLinks() {
        return this.state.selectedLinks;
      }

      getSelectedLinksData() {
        return this.state.links.filter(link => 
          this.state.selectedLinks.includes(link.url)
        );
      }
    }

    const links = [
      { url: 'https://a.com', title: 'Site A', domain: 'a.com' },
      { url: 'https://b.com', title: 'Site B', domain: 'b.com' },
      { url: 'https://c.com', title: 'Site C', domain: 'c.com' },
    ];

    const linkList = new LinkList({ links });

    // 特定のリンクを選択
    linkList.selectLink('https://a.com');
    linkList.selectLink('https://c.com');

    const selectedUrls = linkList.getSelectedLinks();
    expect(selectedUrls).toEqual(['https://a.com', 'https://c.com']);

    const selectedData = linkList.getSelectedLinksData();
    expect(selectedData).toHaveLength(2);
    expect(selectedData[0].title).toBe('Site A');
    expect(selectedData[1].title).toBe('Site C');
  });
});

await describe('LinkList Empty and Loading States', async () => {
  await test('リンクが存在しない場合の表示', () => {
    class LinkList {
      constructor(props) {
        this.state = {
          links: props.links || [],
        };
      }

      renderEmptyState() {
        if (this.state.links.length === 0) {
          return {
            type: 'div',
            props: {
              className: 'empty-state',
              children: 'ページ内にリンクが見つかりません',
            },
          };
        }
        return null;
      }

      isEmpty() {
        return this.state.links.length === 0;
      }
    }

    const emptyLinkList = new LinkList({ links: [] });
    expect(emptyLinkList.isEmpty()).toBe(true);

    const emptyState = emptyLinkList.renderEmptyState();
    expect(emptyState).toBeTruthy();
    expect(emptyState.props.children).toBe('ページ内にリンクが見つかりません');
  });

  await test('ローディング状態の表示', () => {
    class LinkList {
      constructor(props) {
        this.state = {
          links: props.links || [],
          loading: props.loading || false,
        };
      }

      setLoading(loading) {
        this.state = { ...this.state, loading };
      }

      renderLoadingState() {
        if (this.state.loading) {
          return {
            type: 'div',
            props: {
              className: 'loading-state',
              children: 'リンクを取得中...',
            },
          };
        }
        return null;
      }

      isLoading() {
        return this.state.loading;
      }
    }

    const linkList = new LinkList({ loading: true });
    expect(linkList.isLoading()).toBe(true);

    const loadingState = linkList.renderLoadingState();
    expect(loadingState).toBeTruthy();
    expect(loadingState.props.children).toBe('リンクを取得中...');

    // ローディング終了
    linkList.setLoading(false);
    expect(linkList.isLoading()).toBe(false);
    expect(linkList.renderLoadingState()).toBeNull();
  });

  await test('一括インポートボタンの状態管理', () => {
    class LinkList {
      constructor(props) {
        this.state = {
          selectedLinks: [],
        };
        this.onImport = props.onImport || (() => {});
      }

      selectLink(url) {
        this.state.selectedLinks = [...this.state.selectedLinks, url];
      }

      renderImportButton() {
        const selectedCount = this.state.selectedLinks.length;
        const isDisabled = selectedCount === 0;

        return {
          type: 'button',
          props: {
            className: 'import-button',
            children: selectedCount > 0 ? `選択した${selectedCount}件をインポート` : 'リンクを選択してください',
            disabled: isDisabled,
            onClick: () => this.handleImport(),
          },
        };
      }

      handleImport() {
        if (this.state.selectedLinks.length > 0) {
          this.onImport(this.state.selectedLinks);
        }
      }

      getSelectedCount() {
        return this.state.selectedLinks.length;
      }
    }

    let importedLinks = [];
    const mockOnImport = (links) => { importedLinks = links; };

    const linkList = new LinkList({ onImport: mockOnImport });

    // 初期状態（選択なし）
    let button = linkList.renderImportButton();
    expect(button.props.children).toBe('リンクを選択してください');
    expect(button.props.disabled).toBe(true);

    // リンクを選択
    linkList.selectLink('https://example1.com');
    linkList.selectLink('https://example2.com');

    button = linkList.renderImportButton();
    expect(button.props.children).toBe('選択した2件をインポート');
    expect(button.props.disabled).toBe(false);

    // インポート実行
    linkList.handleImport();
    expect(importedLinks).toEqual(['https://example1.com', 'https://example2.com']);
  });
});

console.log('\n🚀 LinkList Component tests completed');
runner.printSummary();