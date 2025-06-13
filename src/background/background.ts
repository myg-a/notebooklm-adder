// Background Service Worker

// 拡張機能のインストール時
chrome.runtime.onInstalled.addListener(() => {
  console.log('NotebookLM Adder installed');
  
  // デフォルト設定を保存
  chrome.storage.local.set({
    userSettings: {
      autoAudioOverview: false,
      excludeDomains: [],
      maxLinksPerPage: 100,
      defaultNotebook: null,
    }
  });
});

// メッセージハンドリング
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAuthToken') {
    // NotebookLMタブから認証トークンを取得
    getAuthTokenFromNotebookLM()
      .then(token => sendResponse({ success: true, token }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスのため
  }
});

/**
 * NotebookLMのタブから認証トークンを取得
 */
async function getAuthTokenFromNotebookLM(): Promise<string> {
  try {
    // NotebookLMのタブを探す
    const tabs = await chrome.tabs.query({ url: 'https://notebooklm.google.com/*' });
    
    if (tabs.length === 0) {
      // NotebookLMが開いていない場合は新しいタブで開く
      const tab = await chrome.tabs.create({ url: 'https://notebooklm.google.com' });
      
      // ページが読み込まれるまで待つ
      await new Promise(resolve => {
        const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(undefined);
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
      
      // 再度タブを取得
      const updatedTabs = await chrome.tabs.query({ url: 'https://notebooklm.google.com/*' });
      if (updatedTabs.length > 0) {
        return await extractTokenFromTab(updatedTabs[0].id!);
      }
    } else {
      // 既存のタブから取得
      return await extractTokenFromTab(tabs[0].id!);
    }
    
    throw new Error('NotebookLMタブが見つかりません');
  } catch (error) {
    throw new Error(`認証トークンの取得に失敗しました: ${error.message}`);
  }
}

/**
 * 指定したタブから認証トークンを抽出
 */
async function extractTokenFromTab(tabId: number): Promise<string> {
  // コンテンツスクリプトを注入してトークンを取得
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      // NotebookLMページ内でトークンを探す
      // 実際の実装では、適切な方法でトークンを取得する必要があります
      const token = (window as any).__notebooklm_token || 
                   localStorage.getItem('notebooklm_token') ||
                   document.cookie.match(/auth_token=([^;]+)/)?.[1];
      return token;
    }
  });
  
  if (results && results[0] && results[0].result) {
    return results[0].result;
  }
  
  throw new Error('トークンが見つかりません');
}

// 拡張機能のアイコンクリック時
chrome.action.onClicked.addListener((tab) => {
  // ポップアップが設定されているので、この処理は実行されない
  // 必要に応じて追加の処理を実装
});

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});