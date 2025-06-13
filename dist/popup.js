// Popup Script - Chrome Extension Compatible

/**
 * NotebookLM API クライアント (インライン実装)
 */
class NotebookLMClient {
  constructor(token) {
    this.token = token;
    this.authParams = {
      bl: 'boq_assistant-bard-web-server_20240101.00_p0',
      _reqid: Math.floor(Math.random() * 100000),
      rt: 'c'
    };
  }

  static create(token) {
    return new NotebookLMClient(token);
  }

  /**
   * ノートブック一覧を取得
   */
  async listNotebooks() {
    // 複数のRPC IDを試行
    const rpcCandidates = [
      { id: 'LFeQOe', params: [] },    // 最新のノートブック一覧
      { id: 'oq7oJd', params: [] },    // 前回試したID
      { id: 'J8iQPb', params: [null] }, // 以前のID
      { id: 'yCXPGe', params: [] },    // 別の候補
      { id: 'HFcRhe', params: [] }     // 別の候補
    ];

    for (let i = 0; i < rpcCandidates.length; i++) {
      const rpc = rpcCandidates[i];
      console.log(`Trying RPC ID: ${rpc.id} (attempt ${i + 1}/${rpcCandidates.length})`);
      
      try {
        const results = await this.execute([rpc]);
        console.log(`Raw response for ${rpc.id}:`, results);
        
        // 成功したレスポンスがあるかチェック
        if (results && Array.isArray(results) && results.length > 0) {
          // エラーでない場合は解析を試行
          const notebooks = this.parseNotebooksResponse(results);
          if (notebooks.length > 0) {
            console.log(`Successfully got notebooks with RPC ID: ${rpc.id}`, notebooks);
            return notebooks;
          }
        }
        
      } catch (error) {
        console.warn(`RPC ID ${rpc.id} failed:`, error.message);
        
        // 最後の試行の場合のみエラーを投げる
        if (i === rpcCandidates.length - 1) {
          throw new Error(`すべてのRPC IDで失敗しました。NotebookLMにログインしていることを確認してください。最後のエラー: ${error.message}`);
        }
        
        // 次のIDを試行
        continue;
      }
    }
    
    return [];
  }

  /**
   * ノートブックレスポンスを解析
   */
  parseNotebooksResponse(results) {
    const notebooks = [];
    
    try {
      // レスポンス構造の詳細解析
      if (results && Array.isArray(results)) {
        for (let i = 0; i < results.length; i++) {
          console.log(`Response[${i}]:`, results[i]);
          
          if (results[i] && Array.isArray(results[i])) {
            const responseData = results[i];
            
            // 複数の可能な構造をチェック
            for (let j = 0; j < responseData.length; j++) {
              const item = responseData[j];
              if (Array.isArray(item) && item.length > 0) {
                console.log(`Checking item[${j}]:`, item);
                
                // ノートブック形式らしきデータを探す
                if (Array.isArray(item[0]) && item[0].length >= 2) {
                  for (const notebook of item) {
                    if (Array.isArray(notebook) && notebook.length >= 2 && 
                        typeof notebook[0] === 'string' && typeof notebook[1] === 'string') {
                      notebooks.push({
                        id: notebook[0],
                        name: notebook[1]
                      });
                    }
                  }
                  
                  if (notebooks.length > 0) {
                    console.log('Found notebooks:', notebooks);
                    return notebooks;
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing notebooks response:', error);
    }
    
    return notebooks;
  }

  /**
   * 新しいノートブックを作成
   */
  async createNotebook(name) {
    try {
      // NotebookLMの実際のノートブック作成RPC
      const rpcs = [{
        id: 'wXbhsf', // 正しいRPC ID（ノートブック作成用）
        params: [null, name, null] // [parent_id, name, description]
      }];
      
      const results = await this.execute(rpcs);
      
      if (results && results[0] && results[0][0]) {
        const notebookData = results[0][0];
        return {
          id: notebookData[0], // NotebookLMが返すID
          name: notebookData[1] || name
        };
      }
      
      throw new Error('NotebookLM API returned invalid response');
    } catch (error) {
      throw new Error(`ノートブックの作成に失敗しました: ${error.message}`);
    }
  }

  /**
   * ソースを追加
   */
  async addSource(notebookId, url, title, enableAudioOverview = false) {
    try {
      // NotebookLMの実際のソース追加RPC
      const rpcs = [{
        id: 'CCqFvf', // 正しいRPC ID（ソース追加用）
        params: [
          notebookId,
          [{
            "1": url,    // URL
            "2": title,  // タイトル
            "3": 1       // ソースタイプ（1=URL）
          }],
          null
        ]
      }];
      
      if (enableAudioOverview) {
        rpcs.push({
          id: 'izAoDd', // オーディオ概要生成RPC
          params: [notebookId]
        });
      }
      
      const results = await this.execute(rpcs);
      
      if (results && results[0] && results[0][0]) {
        const sourceData = results[0][0];
        return {
          id: sourceData[0] || 'src-' + Date.now(),
          url: url,
          title: title
        };
      }
      
      throw new Error('NotebookLM API returned invalid source response');
    } catch (error) {
      throw new Error(`ソースの追加に失敗しました: ${error.message}`);
    }
  }

  /**
   * RPC リクエストを実行
   */
  async execute(rpcs) {
    try {
      // まず簡単なAPI呼び出しで接続をテスト
      const baseUrl = 'https://notebooklm.google.com';
      
      // パラメータの構築
      const params = new URLSearchParams();
      params.set('rpcids', rpcs.map(rpc => rpc.id).join(','));
      params.set('source-path', '/');
      params.set('f.sid', Math.random().toString(36).substring(2, 10));
      params.set('bl', this.authParams.bl);
      params.set('hl', 'ja');
      params.set('soc-app', '165');
      params.set('soc-platform', '1');
      params.set('soc-device', '1');
      params.set('_reqid', this.authParams._reqid.toString());
      params.set('rt', 'c');
      
      const url = `${baseUrl}/_/LabsTailwindUi/data/batchexecute?${params.toString()}`;
      const requestBody = this.buildRequestBody(rpcs);
      
      console.log('NotebookLM API Request Details:', {
        url: url,
        method: 'POST',
        token: this.token ? this.token.substring(0, 15) + '...' : 'none',
        bodyLength: requestBody.length,
        body: requestBody.substring(0, 200) + '...',
        rpcs: rpcs.map(rpc => ({ id: rpc.id, params: rpc.params }))
      });

      // シンプルなフェッチリクエスト
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Same-Domain': '1',
          'X-Goog-BatchExecute-Bgr': this.authParams.bl,
          'Origin': 'https://notebooklm.google.com',
          'Referer': 'https://notebooklm.google.com/',
          'User-Agent': navigator.userAgent
        },
        body: requestBody
      });

      console.log('NotebookLM API Response Status:', response.status, response.statusText);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

      const text = await response.text();
      console.log('Raw Response:', text);

      if (!response.ok) {
        console.error('NotebookLM API Error Response:', text);
        throw new Error(`NotebookLM API error: ${response.status} ${response.statusText}\n\nResponse: ${text.substring(0, 500)}`);
      }

      return this.parseResponse(text);
    } catch (error) {
      console.error('NotebookLM API call failed:', error);
      throw error;
    }
  }

  /**
   * リクエストボディを構築
   */
  buildRequestBody(rpcs) {
    // より正確なGoogle batchexecute形式
    const formData = new URLSearchParams();
    
    // RPCリクエストの構築
    rpcs.forEach((rpc, index) => {
      const rpcArray = [
        [rpc.id, JSON.stringify(rpc.params), null, "generic"]
      ];
      formData.append('f.req', JSON.stringify(rpcArray));
    });
    
    // AT tokenの追加
    const atToken = this.getAtToken();
    if (atToken) {
      formData.append('at', atToken);
    }
    
    const bodyString = formData.toString();
    console.log('Request body:', bodyString);
    
    return bodyString;
  }

  /**
   * CSRF保護用のATトークンを取得
   */
  getAtToken() {
    // 認証トークンがATトークンの場合はそのまま使用
    if (this.token && this.token.startsWith('AF')) {
      console.log('Using AT token:', this.token.substring(0, 10) + '...');
      return this.token;
    }
    
    // セッションベース認証の場合はトークンなしで試行
    console.log('Using session-based auth (no AT token)');
    return '';
  }

  /**
   * レスポンスをパース
   */
  parseResponse(text) {
    try {
      // Google batchexecuteレスポンスの正しいクリーニング
      let cleanText = text;
      
      // プリフィックスを除去
      if (cleanText.startsWith(')]}\'')) {
        cleanText = cleanText.substring(4);
      }
      
      console.log('Cleaned response text:', cleanText.substring(0, 200) + '...');
      
      // JSONをパース
      const parsed = JSON.parse(cleanText);
      console.log('Parsed response:', parsed);
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse response:', error);
      console.error('Raw text:', text.substring(0, 500));
      
      // パースエラーの場合は元のテキストを返す
      throw new Error(`レスポンスのパースに失敗しました: ${error.message}`);
    }
  }

  /**
   * ソースデータを構築
   */
  buildSourceData(url, title) {
    if (this.isYouTubeUrl(url)) {
      return {
        type: 'youtube',
        url: url,
        title: title,
        videoId: this.extractYouTubeVideoId(url)
      };
    } else {
      return {
        type: 'web',
        url: url,
        title: title
      };
    }
  }

  /**
   * YouTube URLかどうか判定
   */
  isYouTubeUrl(url) {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  /**
   * YouTube動画IDを抽出
   */
  extractYouTubeVideoId(url) {
    const match = url.match(/[?&]v=([^&]+)|youtu\.be\/([^?&]+)/);
    return match ? (match[1] || match[2]) : null;
  }
}

// DOMContentLoadedを待つ
document.addEventListener('DOMContentLoaded', async () => {
  const appElement = document.getElementById('app');
  if (!appElement) {
    console.error('App element not found');
    return;
  }

  try {
    // 初期ローディング状態を表示
    appElement.innerHTML = `
      <div class="content">
        <div class="loading">
          <div class="loading-spinner"></div>
          <div>初期化中...</div>
        </div>
      </div>
    `;

    // 認証トークンを取得
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('認証トークンの取得に失敗しました');
    }
    
    // メインアプリを初期化
    initializeApp(appElement, token);
    
  } catch (error) {
    console.error('Initialization error:', error);
    renderError(appElement, error.message);
  }
});

/**
 * 認証トークンを取得
 */
async function getAuthToken() {
  try {
    // まずストレージから取得を試みる
    const stored = await chrome.storage.local.get('authToken');
    if (stored.authToken) {
      console.log('Found stored auth token:', stored.authToken.substring(0, 15) + '...');
      return stored.authToken;
    }
    
    console.log('No stored token, requesting from background script...');
    
    // バックグラウンドスクリプトから取得
    const response = await chrome.runtime.sendMessage({ action: 'getAuthToken' });
    console.log('Background script response:', { success: response.success, hasToken: !!response.token, error: response.error });
    
    if (response.success && response.token) {
      // トークンを保存
      await chrome.storage.local.set({ authToken: response.token });
      console.log('Saved new auth token:', response.token.substring(0, 15) + '...');
      return response.token;
    }
    
    throw new Error(response.error || '認証トークンの取得に失敗しました');
  } catch (error) {
    console.error('Auth token retrieval failed:', error);
    throw new Error(`認証エラー: ${error.message}`);
  }
}

/**
 * メインアプリを初期化
 */
async function initializeApp(container, token) {
  // 基本的なUI状態
  const state = {
    currentTab: 'import-page',
    notebooks: [],
    selectedNotebook: null,
    currentPage: null,
    links: [],
    selectedLinks: [],
    loading: false,
    error: null,
    success: null,
    token: token,
  };

  // NotebookLM APIクライアントを初期化
  const apiClient = new NotebookLMClient(token);

  // 現在のタブ情報を取得
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]) {
      state.currentPage = {
        url: tabs[0].url,
        title: tabs[0].title,
        id: tabs[0].id,
      };
    }
    
    // ノートブック一覧を取得
    try {
      state.loading = true;
      renderApp(container, state, apiClient);
      
      const notebooks = await apiClient.listNotebooks();
      state.notebooks = notebooks;
      
      if (notebooks.length === 0) {
        state.error = 'ノートブックが見つかりませんでした。先にNotebookLMでノートブックを作成してください。';
      }
      
      state.loading = false;
      renderApp(container, state, apiClient);
    } catch (error) {
      state.error = `${error.message}\n\n【解決方法】\n1. NotebookLM (https://notebooklm.google.com) にログインしてください\n2. 拡張機能を再度お試しください`;
      state.loading = false;
      renderApp(container, state, apiClient);
    }
  });

  // 初期レンダリング
  renderApp(container, state, apiClient);
}

/**
 * アプリのメインレンダリング
 */
function renderApp(container, state, apiClient) {
  container.innerHTML = `
    <div class="tabs">
      <button class="tab ${state.currentTab === 'import-page' ? 'active' : ''}" data-tab="import-page">
        現在のページ
      </button>
      <button class="tab ${state.currentTab === 'import-links' ? 'active' : ''}" data-tab="import-links">
        ページ内リンク
      </button>
      <button class="tab ${state.currentTab === 'create-notebook' ? 'active' : ''}" data-tab="create-notebook">
        新しいノートブック
      </button>
    </div>
    
    <div class="content">
      ${state.error ? `<div class="error">${state.error}</div>` : ''}
      ${state.success ? `<div class="success">${state.success}</div>` : ''}
      
      ${renderTabContent(state)}
    </div>
  `;

  // イベントリスナーを設定
  setupEventListeners(container, state, apiClient);
}

/**
 * タブコンテンツをレンダリング
 */
function renderTabContent(state) {
  switch (state.currentTab) {
    case 'import-page':
      return renderImportPageTab(state);
    case 'import-links':
      return renderImportLinksTab(state);
    case 'create-notebook':
      return renderCreateNotebookTab(state);
    default:
      return '<div>Unknown tab</div>';
  }
}

/**
 * 現在のページインポートタブ
 */
function renderImportPageTab(state) {
  return `
    <h3>現在のページをインポート</h3>
    ${state.currentPage ? `
      <div class="page-info">
        <div class="page-title">${state.currentPage.title}</div>
        <div class="page-url">${state.currentPage.url}</div>
      </div>
    ` : '<div>ページ情報を取得中...</div>'}
    
    <div class="notebook-selector">
      <label>ノートブックを選択:</label>
      <select id="notebook-select" ${state.loading ? 'disabled' : ''}>
        <option value="">ノートブックを選択してください</option>
        ${state.notebooks.map(nb => `
          <option value="${nb.id}" ${state.selectedNotebook === nb.id ? 'selected' : ''}>
            ${nb.name}
          </option>
        `).join('')}
      </select>
    </div>
    
    <button class="button button-primary" id="import-page-btn" 
            ${!state.selectedNotebook || state.loading ? 'disabled' : ''}>
      ${state.loading ? 'インポート中...' : 'ページをインポート'}
    </button>
  `;
}

/**
 * リンク一括インポートタブ
 */
function renderImportLinksTab(state) {
  return `
    <h3>ページ内リンクをインポート</h3>
    
    <button class="button button-secondary" id="load-links-btn" 
            ${state.loading ? 'disabled' : ''}>
      ${state.loading ? '取得中...' : 'リンクを取得'}
    </button>
    
    ${state.links.length > 0 ? `
      <div class="link-list">
        <div class="link-actions">
          <button class="button button-secondary" id="select-all-btn">全選択</button>
          <button class="button button-secondary" id="deselect-all-btn">全解除</button>
        </div>
        
        <div class="link-items">
          ${state.links.map(link => `
            <div class="link-item">
              <input type="checkbox" value="${link.url}" 
                     ${state.selectedLinks.includes(link.url) ? 'checked' : ''}
                     class="link-checkbox">
              <div class="link-content">
                <div class="link-title">${link.title}</div>
                <div class="link-domain">(${link.domain})</div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="notebook-selector">
          <select id="bulk-notebook-select">
            <option value="">ノートブックを選択してください</option>
            ${state.notebooks.map(nb => `
              <option value="${nb.id}">${nb.name}</option>
            `).join('')}
          </select>
        </div>
        
        <button class="button button-primary" id="import-selected-btn"
                ${state.selectedLinks.length === 0 || state.loading ? 'disabled' : ''}>
          選択した${state.selectedLinks.length}件をインポート
        </button>
      </div>
    ` : '<div class="empty-state">「リンクを取得」ボタンをクリックしてください</div>'}
  `;
}

/**
 * 新しいノートブック作成タブ
 */
function renderCreateNotebookTab(state) {
  return `
    <h3>新しいノートブックを作成</h3>
    
    <div class="input-group">
      <label for="notebook-name">ノートブック名:</label>
      <input type="text" id="notebook-name" placeholder="ノートブック名を入力" 
             ${state.loading ? 'disabled' : ''}>
    </div>
    
    <button class="button button-primary" id="create-notebook-btn" 
            ${state.loading ? 'disabled' : ''}>
      ${state.loading ? '作成中...' : 'ノートブックを作成'}
    </button>
  `;
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners(container, state, apiClient) {
  // タブ切り替え
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      if (tabName && tabName !== state.currentTab) {
        state.currentTab = tabName;
        state.error = null;
        state.success = null;
        renderApp(container, state, apiClient);
      }
    });
  });

  // ノートブック選択
  const notebookSelect = container.querySelector('#notebook-select');
  if (notebookSelect) {
    notebookSelect.addEventListener('change', (e) => {
      state.selectedNotebook = e.target.value;
      renderApp(container, state, apiClient);
    });
  }

  // ページインポートボタン
  const importPageBtn = container.querySelector('#import-page-btn');
  if (importPageBtn) {
    importPageBtn.addEventListener('click', async () => {
      if (state.selectedNotebook && state.currentPage) {
        state.loading = true;
        state.error = null;
        renderApp(container, state, apiClient);
        
        try {
          // 実際のAPIを呼び出す
          const result = await apiClient.addSource(
            state.selectedNotebook,
            state.currentPage.url,
            state.currentPage.title
          );
          state.success = `ページが正常にインポートされました！ (ID: ${result.id})`;
        } catch (error) {
          state.error = `インポートに失敗しました: ${error.message}`;
        } finally {
          state.loading = false;
          renderApp(container, state, apiClient);
        }
      }
    });
  }

  // リンク取得ボタン
  const loadLinksBtn = container.querySelector('#load-links-btn');
  if (loadLinksBtn) {
    loadLinksBtn.addEventListener('click', async () => {
      state.loading = true;
      state.error = null;
      renderApp(container, state);
      
      try {
        // コンテンツスクリプトからリンクを取得
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'extractLinks' });
          if (response.success) {
            state.links = response.links;
            state.selectedLinks = [];
          } else {
            throw new Error(response.error || 'リンクの取得に失敗しました');
          }
        }
      } catch (error) {
        state.error = `リンク取得に失敗しました: ${error.message}`;
      } finally {
        state.loading = false;
        renderApp(container, state, apiClient);
      }
    });
  }

  // 新しいノートブック作成ボタン
  const createNotebookBtn = container.querySelector('#create-notebook-btn');
  if (createNotebookBtn) {
    createNotebookBtn.addEventListener('click', async () => {
      const nameInput = container.querySelector('#notebook-name');
      const name = nameInput?.value?.trim();
      
      if (name) {
        state.loading = true;
        state.error = null;
        renderApp(container, state, apiClient);
        
        try {
          const result = await apiClient.createNotebook(name);
          state.success = `ノートブック「${result.name}」が作成されました！`;
          
          // 作成したノートブックをリストに追加
          state.notebooks.push(result);
          state.selectedNotebook = result.id;
          
          // 作成成功後は現在のページタブに移動
          state.currentTab = 'import-page';
        } catch (error) {
          state.error = `ノートブック作成に失敗しました: ${error.message}`;
        } finally {
          state.loading = false;
          renderApp(container, state, apiClient);
        }
      } else {
        state.error = 'ノートブック名を入力してください';
        renderApp(container, state, apiClient);
      }
    });
  }

  // 全選択ボタン
  const selectAllBtn = container.querySelector('#select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', () => {
      state.selectedLinks = state.links.map(link => link.url);
      renderApp(container, state, apiClient);
    });
  }

  // 全解除ボタン
  const deselectAllBtn = container.querySelector('#deselect-all-btn');
  if (deselectAllBtn) {
    deselectAllBtn.addEventListener('click', () => {
      state.selectedLinks = [];
      renderApp(container, state, apiClient);
    });
  }

  // リンクチェックボックス
  container.querySelectorAll('.link-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const url = e.target.value;
      if (e.target.checked) {
        if (!state.selectedLinks.includes(url)) {
          state.selectedLinks.push(url);
        }
      } else {
        state.selectedLinks = state.selectedLinks.filter(link => link !== url);
      }
      renderApp(container, state, apiClient);
    });
  });

  // 選択したリンクを一括インポート
  const importSelectedBtn = container.querySelector('#import-selected-btn');
  if (importSelectedBtn) {
    importSelectedBtn.addEventListener('click', async () => {
      const selectedNotebook = container.querySelector('#bulk-notebook-select')?.value;
      
      if (selectedNotebook && state.selectedLinks.length > 0) {
        state.loading = true;
        state.error = null;
        renderApp(container, state, apiClient);
        
        try {
          let successCount = 0;
          for (const url of state.selectedLinks) {
            const link = state.links.find(l => l.url === url);
            if (link) {
              await apiClient.addSource(selectedNotebook, link.url, link.title);
              successCount++;
            }
          }
          state.success = `${successCount}件のリンクが正常にインポートされました！`;
          state.selectedLinks = []; // インポート後は選択をクリア
        } catch (error) {
          state.error = `一括インポートに失敗しました: ${error.message}`;
        } finally {
          state.loading = false;
          renderApp(container, state, apiClient);
        }
      }
    });
  }
}

/**
 * エラー表示
 */
function renderError(container, message) {
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