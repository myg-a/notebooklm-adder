// LinkList Component の実装
import type { PageLink, VirtualElement } from './types';

export interface LinkListProps {
  links: PageLink[];
  selectedLinks?: string[];
  loading?: boolean;
  onSelectionChange?: (selectedLinks: string[]) => void;
  onImport?: (selectedLinks: string[]) => void;
}

export interface LinkListState {
  links: PageLink[];
  selectedLinks: string[];
  loading: boolean;
}

export class LinkList {
  public props: LinkListProps;
  public state: LinkListState;
  private onSelectionChange: (selectedLinks: string[]) => void;
  private onImport: (selectedLinks: string[]) => void;

  constructor(props: LinkListProps) {
    this.props = props;
    this.onSelectionChange = props.onSelectionChange || (() => {});
    this.onImport = props.onImport || (() => {});

    this.state = {
      links: props.links || [],
      selectedLinks: props.selectedLinks || [],
      loading: props.loading || false,
    };
  }

  /**
   * メインレンダリングメソッド
   */
  render(): VirtualElement {
    if (this.state.loading) {
      return this.renderLoadingState();
    }

    return {
      type: 'div',
      props: {
        className: 'link-list',
        children: [
          this.renderHeader(),
          this.renderActions(),
          this.renderContent(),
          this.renderImportButton(),
        ],
      },
    };
  }

  /**
   * ヘッダー部分をレンダリング
   */
  renderHeader(): VirtualElement {
    const count = this.state.links.length;
    return {
      type: 'h3',
      props: {
        className: 'link-list-header',
        children: `ページ内リンク (${count}件)`,
      },
    };
  }

  /**
   * アクション部分（全選択・全解除）をレンダリング
   */
  renderActions(): VirtualElement {
    return {
      type: 'div',
      props: {
        className: 'link-actions',
        children: [
          {
            type: 'button',
            props: {
              children: '全選択',
              className: 'select-all-btn',
              onClick: () => this.selectAll(),
              disabled: this.state.links.length === 0,
            },
          },
          {
            type: 'button',
            props: {
              children: '全解除',
              className: 'deselect-all-btn',
              onClick: () => this.deselectAll(),
              disabled: this.state.selectedLinks.length === 0,
            },
          },
        ],
      },
    };
  }

  /**
   * コンテンツ部分をレンダリング
   */
  renderContent(): VirtualElement {
    if (this.state.links.length === 0) {
      return this.renderEmptyState();
    }

    return this.renderLinkItems();
  }

  /**
   * リンク一覧をレンダリング
   */
  renderLinkItems(): VirtualElement {
    return {
      type: 'div',
      props: {
        className: 'link-items',
        children: this.state.links.map(link => this.renderLinkItem(link)),
      },
    };
  }

  /**
   * 個別のリンクアイテムをレンダリング
   */
  renderLinkItem(link: PageLink): VirtualElement {
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
              onChange: () => this.toggleLink(link.url),
            },
          },
          {
            type: 'div',
            props: {
              className: 'link-content',
              children: [
                {
                  type: 'span',
                  props: {
                    className: 'link-title',
                    children: link.title || link.url,
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
          },
        ],
      },
    };
  }

  /**
   * 空状態をレンダリング
   */
  renderEmptyState(): VirtualElement {
    return {
      type: 'div',
      props: {
        className: 'empty-state',
        children: 'ページ内にリンクが見つかりません',
      },
    };
  }

  /**
   * ローディング状態をレンダリング
   */
  renderLoadingState(): VirtualElement {
    return {
      type: 'div',
      props: {
        className: 'loading-state',
        children: [
          {
            type: 'div',
            props: {
              className: 'loading-spinner',
            },
          },
          {
            type: 'span',
            props: {
              children: 'リンクを取得中...',
            },
          },
        ],
      },
    };
  }

  /**
   * インポートボタンをレンダリング
   */
  renderImportButton(): VirtualElement {
    const selectedCount = this.state.selectedLinks.length;
    const isDisabled = selectedCount === 0;

    return {
      type: 'button',
      props: {
        className: `import-button ${isDisabled ? 'disabled' : ''}`,
        children: selectedCount > 0 
          ? `選択した${selectedCount}件をインポート` 
          : 'リンクを選択してください',
        disabled: isDisabled,
        onClick: () => this.handleImport(),
      },
    };
  }

  /**
   * リンクの選択状態をトグル
   */
  toggleLink(url: string): void {
    const isSelected = this.state.selectedLinks.includes(url);
    let newSelectedLinks: string[];

    if (isSelected) {
      newSelectedLinks = this.state.selectedLinks.filter(link => link !== url);
    } else {
      newSelectedLinks = [...this.state.selectedLinks, url];
    }

    this.setState({ selectedLinks: newSelectedLinks });
    this.onSelectionChange(newSelectedLinks);
  }

  /**
   * 全てのリンクを選択
   */
  selectAll(): void {
    const allUrls = this.state.links.map(link => link.url);
    this.setState({ selectedLinks: allUrls });
    this.onSelectionChange(allUrls);
  }

  /**
   * 全ての選択を解除
   */
  deselectAll(): void {
    this.setState({ selectedLinks: [] });
    this.onSelectionChange([]);
  }

  /**
   * 特定のリンクを選択
   */
  selectLink(url: string): void {
    if (!this.state.selectedLinks.includes(url)) {
      const newSelectedLinks = [...this.state.selectedLinks, url];
      this.setState({ selectedLinks: newSelectedLinks });
      this.onSelectionChange(newSelectedLinks);
    }
  }

  /**
   * インポート処理を実行
   */
  handleImport(): void {
    if (this.state.selectedLinks.length > 0) {
      this.onImport(this.state.selectedLinks);
    }
  }

  /**
   * ローディング状態を設定
   */
  setLoading(loading: boolean): void {
    this.setState({ loading });
  }

  /**
   * リンク一覧を更新
   */
  updateLinks(links: PageLink[]): void {
    this.setState({ 
      links,
      selectedLinks: [], // 新しいリンクリストでは選択状態をリセット
    });
    this.onSelectionChange([]);
  }

  /**
   * 選択されたリンクURLを取得
   */
  getSelectedLinks(): string[] {
    return this.state.selectedLinks;
  }

  /**
   * 選択されたリンクのデータを取得
   */
  getSelectedLinksData(): PageLink[] {
    return this.state.links.filter(link => 
      this.state.selectedLinks.includes(link.url)
    );
  }

  /**
   * 特定のリンクが選択されているかチェック
   */
  isLinkSelected(url: string): boolean {
    return this.state.selectedLinks.includes(url);
  }

  /**
   * 選択されたリンクの数を取得
   */
  getSelectedCount(): number {
    return this.state.selectedLinks.length;
  }

  /**
   * 全リンクの数を取得
   */
  getAllLinksCount(): number {
    return this.state.links.length;
  }

  /**
   * リンク一覧が空かどうかチェック
   */
  isEmpty(): boolean {
    return this.state.links.length === 0;
  }

  /**
   * ローディング中かどうかチェック
   */
  isLoading(): boolean {
    return this.state.loading;
  }

  /**
   * 状態を更新
   */
  private setState(newState: Partial<LinkListState>): void {
    this.state = { ...this.state, ...newState };
  }
}