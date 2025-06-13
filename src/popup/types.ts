// Popup関連の型定義

export interface PopupState {
  currentTab: TabType;
  notebooks: Notebook[];
  selectedNotebook: string | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  notebookUrl: string | null;
  pageLinks: PageLink[];
  selectedLinks: string[];
}

export type TabType = 'current' | 'links' | 'new';

export interface Notebook {
  id: string;
  title: string;
  emoji: string;
}

export interface PageLink {
  url: string;
  title: string;
  domain: string;
}

export interface VirtualElement {
  type: string;
  props: {
    className?: string;
    children?: any;
    placeholder?: string;
    onClick?: () => void;
    onChange?: (value: any) => void;
    disabled?: boolean;
  };
}

export interface PopupProps {
  container: HTMLElement;
  notebookClient?: any; // NotebookLMClient
}