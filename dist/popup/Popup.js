// Popup Entry Point
import { Popup } from './Popup';
import { NotebookLMClient } from '../api/NotebookLMClient';
import { TabUtils, MessageHandler, SettingsManager } from '../utils/chromeUtils';

// DOMContentLoadedを待つ
document.addEventListener('DOMContentLoaded', async () => {
  const appElement = document.getElementById('app');
  if (!appElement) {
    console.error('App element not found');
    return;
  }

  try {
    // 認証トークンを取得
    const token = await getAuthToken();
    
    // NotebookLMクライアントを初期化
    const client = NotebookLMClient.create(token);
    
    // ポップアップコンポーネントを初期化
    const popup = new Popup({ client });
    
    // 初期レンダリング
    render(appElement, popup);
    
    // 設定を読み込み
    const settings = await SettingsManager.loadSettings();
    popup.updateSettings(settings);
    
    // 現在のタブ情報を取得
    const currentTab = await TabUtils.getCurrentTab();
    popup.setCurrentTab(currentTab);
    
    // ノートブック一覧を読み込み
    await popup.loadNotebooks();
    
  } catch (error) {
    console.error('Initialization error:', error);
    renderError(appElement, error.message);
  }
});

/**
 * 認証トークンを取得
 */
async function getAuthToken(): Promise<string> {
  try {
    // まずストレージから取得を試みる
    const stored = await chrome.storage.local.get('authToken');
    if (stored.authToken) {
      return stored.authToken;
    }
    
    // バックグラウンドスクリプトから取得
    const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    if (response.success && response.token) {
      // トークンを保存
      await chrome.storage.local.set({ authToken: response.token });
      return response.token;
    }
    
    throw new Error('認証トークンの取得に失敗しました');
  } catch (error) {
    throw new Error(`認証エラー: ${error.message}`);
  }
}

/**
 * コンポーネントをレンダリング
 */
function render(container: HTMLElement, popup: Popup) {
  // Virtual DOMをHTML要素に変換する簡易実装
  const virtualElement = popup.render();
  const htmlElement = createHTMLElement(virtualElement);
  
  // コンテナをクリアして新しい要素を追加
  container.innerHTML = '';
  container.appendChild(htmlElement);
  
  // イベントリスナーを設定
  setupEventListeners(container, popup);
}

/**
 * Virtual ElementをHTML要素に変換
 */
function createHTMLElement(vElement: any): HTMLElement {
  if (typeof vElement === 'string') {
    return document.createTextNode(vElement) as any;
  }
  
  const element = document.createElement(vElement.type);
  
  if (vElement.props) {
    const { children, onClick, onChange, ...attrs } = vElement.props;
    
    // 属性を設定
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value as string;
      } else if (key === 'checked' || key === 'disabled') {
        (element as any)[key] = value;
      } else {
        element.setAttribute(key, String(value));
      }
    });
    
    // 子要素を追加
    if (children) {
      const childArray = Array.isArray(children) ? children : [children];
      childArray.forEach(child => {
        if (child) {
          element.appendChild(createHTMLElement(child));
        }
      });
    }
  }
  
  return element;
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners(container: HTMLElement, popup: Popup) {
  // タブ切り替え
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = (e.target as HTMLElement).dataset.tab;
      if (tabName) {
        popup.setCurrentTab(tabName);
        render(container, popup);
      }
    });
  });
  
  // その他のイベントハンドラーも同様に設定
  // 実際の実装では、より洗練されたイベント処理システムが必要
}

/**
 * エラー表示
 */
function renderError(container: HTMLElement, message: string) {
  container.innerHTML = `
    <div class="content">
      <div class="error">
        <h3>エラーが発生しました</h3>
        <p>${message}</p>
        <button class="button button-primary" onclick="location.reload()">
          再読み込み
        </button>
      </div>
    </div>
  `;
}