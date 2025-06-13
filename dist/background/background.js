// Background Service Worker - Chrome Extension Compatible

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
  
  if (request.action === 'pageReady') {
    // ページ読み込み完了の通知を受信
    console.log('Page ready:', request.url);
  }
});

/**
 * NotebookLMのタブから認証トークンを取得
 */
async function getAuthTokenFromNotebookLM() {
  try {
    // NotebookLMのタブを探す
    const tabs = await chrome.tabs.query({ url: 'https://notebooklm.google.com/*' });
    
    if (tabs.length === 0) {
      // NotebookLMが開いていない場合は新しいタブで開く
      const tab = await chrome.tabs.create({ url: 'https://notebooklm.google.com' });
      
      // ページが読み込まれるまで待つ
      await new Promise(resolve => {
        const listener = (tabId, changeInfo) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
      
      // 再度タブを取得
      const updatedTabs = await chrome.tabs.query({ url: 'https://notebooklm.google.com/*' });
      if (updatedTabs.length > 0) {
        return await extractTokenFromTab(updatedTabs[0].id);
      }
    } else {
      // 既存のタブから取得
      return await extractTokenFromTab(tabs[0].id);
    }
    
    throw new Error('NotebookLMタブが見つかりません');
  } catch (error) {
    throw new Error(`認証トークンの取得に失敗しました: ${error.message}`);
  }
}

/**
 * 指定したタブから認証トークンを抽出
 */
async function extractTokenFromTab(tabId) {
  try {
    // NotebookLMページから実際の認証情報を抽出
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // NotebookLMの認証情報抽出
        const extractionResults = {
          cookies: {},
          atToken: null,
          sessionInfo: null,
          pageContent: null
        };
        
        // 1. 重要なCookieを抽出
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name && value) {
            extractionResults.cookies[name] = value;
          }
        }
        
        // 2. ページ内のスクリプトからATトークンを探す
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || script.innerHTML;
          
          // AT (CSRF) トークンを探す
          const atMatch = content.match(/["']AF[A-Za-z0-9_-]+["']/);
          if (atMatch) {
            extractionResults.atToken = atMatch[0].replace(/["']/g, '');
            break;
          }
          
          // 別のパターンでATトークンを探す
          const atMatch2 = content.match(/at["\s]*:["\s]*([A-Za-z0-9_-]+)/);
          if (atMatch2) {
            extractionResults.atToken = atMatch2[1];
            break;
          }
        }
        
        // 3. WindowオブジェクトからWIZGlobalDataを探す
        if (window.WIZ_global_data) {
          extractionResults.sessionInfo = {
            hasWizData: true,
            keys: Object.keys(window.WIZ_global_data)
          };
          
          // ATトークンがWIZデータに含まれている可能性
          const wizString = JSON.stringify(window.WIZ_global_data);
          const wizAtMatch = wizString.match(/AF[A-Za-z0-9_-]{20,}/);
          if (wizAtMatch) {
            extractionResults.atToken = wizAtMatch[0];
          }
        }
        
        // 4. ページのHTMLから隠しフィールドを探す
        const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
        for (const input of hiddenInputs) {
          if (input.name === 'at' || input.name === 'authenticity_token') {
            extractionResults.atToken = input.value;
            break;
          }
        }
        
        // 5. MetaタグからCSRFトークンを探す
        const metaTags = document.querySelectorAll('meta');
        for (const meta of metaTags) {
          if (meta.name === 'csrf-token' || meta.name === 'authenticity-token') {
            extractionResults.atToken = meta.content;
            break;
          }
        }
        
        // 6. ページの詳細情報
        extractionResults.pageContent = {
          url: window.location.href,
          title: document.title,
          hasNotebookLMApp: !!document.querySelector('[data-app-root]'),
          hasGoogleSignIn: !!document.querySelector('[data-signin]'),
          userSignedIn: !document.querySelector('sign-in') && document.querySelector('[data-user]')
        };
        
        return extractionResults;
      }
    });
    
    if (results && results[0] && results[0].result) {
      const data = results[0].result;
      console.log('NotebookLM page analysis:', {
        hasAtToken: !!data.atToken,
        cookiesCount: data.cookies ? Object.keys(data.cookies).length : 0,
        pageInfo: data.pageContent,
        sessionInfo: data.sessionInfo
      });
      
      // ATトークンが見つかった場合はそれを使用
      if (data.atToken) {
        console.log('Found AT token:', data.atToken.substring(0, 10) + '...');
        return data.atToken;
      }
      
      // セッションCookieが有効な場合
      if (data.cookies && Object.keys(data.cookies).length > 0) {
        console.log('Found cookies, using session-based auth. Cookies:', Object.keys(data.cookies));
        return 'session_based_auth';
      }
      
      console.warn('No authentication data found. Page might not be logged in.');
      throw new Error('認証情報が見つかりません。NotebookLMにログインしているか確認してください。');
    }
    
    throw new Error('スクリプト実行結果が無効です');
  } catch (error) {
    console.error('Token extraction failed:', error);
    throw new Error(`認証トークンの抽出に失敗しました: ${error.message}`);
  }
}

// 拡張機能のアイコンクリック時
chrome.action.onClicked.addListener((tab) => {
  // ポップアップが設定されているので、この処理は実行されない
  // 必要に応じて追加の処理を実装
  console.log('Extension icon clicked for tab:', tab.url);
});

// エラーハンドリング
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});