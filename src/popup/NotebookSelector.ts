// NotebookSelector Component の実装
import type { Notebook, VirtualElement } from './types';

export interface NotebookSelectorProps {
  notebooks: Notebook[];
  selectedNotebook?: string | null;
  onSelect?: (notebookId: string) => void;
  disabled?: boolean;
}

export interface NotebookSelectorState {
  isOpen: boolean;
  searchTerm: string;
  filteredNotebooks: Notebook[];
}

export class NotebookSelector {
  public props: NotebookSelectorProps;
  public state: NotebookSelectorState;
  private onSelect: (notebookId: string) => void;

  constructor(props: NotebookSelectorProps) {
    this.props = props;
    this.onSelect = props.onSelect || (() => {});
    
    this.state = {
      isOpen: false,
      searchTerm: '',
      filteredNotebooks: props.notebooks || [],
    };
  }

  /**
   * メインレンダリングメソッド
   */
  render(): VirtualElement {
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

  /**
   * 選択されたノートブック表示部分をレンダリング
   */
  renderSelectedNotebook(): VirtualElement {
    const selected = this.props.notebooks?.find(nb => nb.id === this.props.selectedNotebook);
    
    return {
      type: 'button',
      props: {
        className: `selected-notebook ${this.props.disabled ? 'disabled' : ''}`,
        children: selected ? `${selected.emoji} ${selected.title}` : 'ノートブックを選択',
        onClick: () => this.toggle(),
        disabled: this.props.disabled,
      },
    };
  }

  /**
   * ドロップダウン部分をレンダリング
   */
  renderDropdown(): VirtualElement | null {
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

  /**
   * 検索入力フィールドをレンダリング
   */
  renderSearchInput(): VirtualElement {
    return {
      type: 'input',
      props: {
        className: 'search-input',
        placeholder: 'ノートブックを検索...',
        onChange: (value: string) => this.updateSearch(value),
      },
    };
  }

  /**
   * ノートブック一覧をレンダリング
   */
  renderNotebookList(): VirtualElement {
    if (this.state.filteredNotebooks.length === 0) {
      return this.renderEmptyState();
    }

    return {
      type: 'div',
      props: {
        className: 'notebook-list',
        children: this.state.filteredNotebooks.map(notebook => ({
          type: 'div',
          props: {
            className: `notebook-item ${this.props.selectedNotebook === notebook.id ? 'selected' : ''}`,
            children: `${notebook.emoji} ${notebook.title}`,
            onClick: () => this.selectNotebook(notebook.id),
          },
        })),
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
        children: 'ノートブックが見つかりません',
      },
    };
  }

  /**
   * ドロップダウンを開く
   */
  open(): void {
    this.setState({ isOpen: true });
  }

  /**
   * ドロップダウンを閉じる
   */
  close(): void {
    this.setState({ isOpen: false });
  }

  /**
   * ドロップダウンの開閉をトグル
   */
  toggle(): void {
    this.setState({ isOpen: !this.state.isOpen });
  }

  /**
   * ドロップダウンが開いているかチェック
   */
  isOpen(): boolean {
    return this.state.isOpen;
  }

  /**
   * 検索クエリを更新
   */
  updateSearch(searchTerm: string): void {
    const filtered = this.props.notebooks.filter(notebook =>
      notebook.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    this.setState({
      searchTerm,
      filteredNotebooks: filtered,
    });
  }

  /**
   * ノートブックを選択
   */
  selectNotebook(notebookId: string): void {
    this.onSelect(notebookId);
    this.close();
  }

  /**
   * 選択されたノートブックIDを取得
   */
  getSelectedNotebook(): string | null {
    return this.props.selectedNotebook || null;
  }

  /**
   * フィルタリングされたノートブック一覧を取得
   */
  getFilteredNotebooks(): Notebook[] {
    return this.state.filteredNotebooks;
  }

  /**
   * 状態を更新
   */
  private setState(newState: Partial<NotebookSelectorState>): void {
    this.state = { ...this.state, ...newState };
  }
}