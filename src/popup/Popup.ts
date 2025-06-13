// Popup Entry Point - NotebookLM Importerに準じる実装
import { NotebookLMClient } from '../api/NotebookLMClient';

// NotebookLM Importerと同様のポップアップ初期化
document.addEventListener('DOMContentLoaded', async () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('Root element not found');
    return;
  }

  try {
    // React風のPopupコンポーネントの代わりに、直接DOM操作でUI構築
    await initializePopup(rootElement);
  } catch (error) {
    console.error('Initialization error:', error);
    renderError(rootElement, error);
  }
});

/**
 * ポップアップを初期化（NotebookLM Importerの方式に準拠）
 */
async function initializePopup(container: HTMLElement) {
  // ローディング表示
  container.innerHTML = `
    <div class="w-96 h-[400px] p-4 flex flex-col">
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p class="text-sm text-gray-600">NotebookLMに接続中...</p>
        </div>
      </div>
    </div>
  `;

  try {
    // NotebookLMクライアントの初期化
    const client = await NotebookLMClient.create();
    
    // ノートブック一覧を取得
    const notebooks = await client.listNotebooks();
    
    // UIを構築
    renderMainUI(container, client, notebooks);
    
  } catch (error) {
    renderAuthError(container);
  }
}

/**
 * メインUIをレンダリング
 */
function renderMainUI(container: HTMLElement, client: NotebookLMClient, notebooks: any[]) {
  container.innerHTML = `
    <div class="w-96 h-[400px] p-4 flex flex-col gap-4">
      <h1 class="text-lg font-bold">NotebookLM にインポート</h1>
      
      <!-- 既存ノートブックへの追加 -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700">ノートブックを選択:</label>
        <select id="notebook-select" class="w-full p-2 border border-gray-300 rounded-md">
          ${notebooks.map(nb => `<option value="${nb.id}">${nb.emoji || '📔'} ${nb.title}</option>`).join('')}
        </select>
        <button id="add-to-existing" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50">
          選択したノートブックに追加
        </button>
      </div>
      
      <!-- 新規ノートブック作成 -->
      <div class="space-y-2">
        <button id="create-new" class="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50">
          📔 新しいノートブックを作成
        </button>
      </div>
      
      <!-- 結果表示エリア -->
      <div id="result-area" class="hidden mt-4"></div>
      
      <!-- フッター -->
      <div class="flex justify-between mt-auto text-sm">
        <div class="flex items-center space-x-2">
          <label class="flex items-center space-x-1">
            <input type="checkbox" id="auto-audio" class="rounded">
            <span class="text-xs">音声概要を自動作成</span>
          </label>
        </div>
        <a href="https://github.com/your-repo/issues" target="_blank" class="text-blue-600 hover:underline">
          フィードバック
        </a>
      </div>
    </div>
  `;

  // イベントリスナーを設定
  setupEventHandlers(container, client, notebooks);
}

/**
 * イベントハンドラーを設定
 */
function setupEventHandlers(container: HTMLElement, client: NotebookLMClient, notebooks: any[]) {
  const addToExistingBtn = container.querySelector('#add-to-existing') as HTMLButtonElement;
  const createNewBtn = container.querySelector('#create-new') as HTMLButtonElement;
  const notebookSelect = container.querySelector('#notebook-select') as HTMLSelectElement;
  const autoAudioCheckbox = container.querySelector('#auto-audio') as HTMLInputElement;
  const resultArea = container.querySelector('#result-area') as HTMLDivElement;

  // 既存ノートブックに追加
  addToExistingBtn.addEventListener('click', async () => {
    const selectedNotebookId = notebookSelect.value;
    if (!selectedNotebookId) return;

    addToExistingBtn.disabled = true;
    addToExistingBtn.textContent = '追加中...';

    try {
      const currentTab = await getCurrentTab();
      await client.addSource(selectedNotebookId, currentTab.url);
      
      showSuccess(resultArea, `https://notebooklm.google.com/notebook/${selectedNotebookId}`);
    } catch (error) {
      showError(resultArea, error);
    } finally {
      addToExistingBtn.disabled = false;
      addToExistingBtn.textContent = '選択したノートブックに追加';
    }
  });

  // 新規ノートブック作成
  createNewBtn.addEventListener('click', async () => {
    createNewBtn.disabled = true;
    createNewBtn.textContent = '作成中...';

    try {
      const currentTab = await getCurrentTab();
      const title = currentTab.title || 'Untitled';
      
      const { id: notebookId } = await client.createNotebook(title, '📔');
      await client.addSource(notebookId, currentTab.url);
      
      // 音声概要の自動作成
      if (autoAudioCheckbox.checked) {
        try {
          await client.createAudioOverview(notebookId);
        } catch (error) {
          console.warn('音声概要の作成に失敗:', error);
        }
      }
      
      showSuccess(resultArea, `https://notebooklm.google.com/notebook/${notebookId}`);
    } catch (error) {
      showError(resultArea, error);
    } finally {
      createNewBtn.disabled = false;
      createNewBtn.textContent = '📔 新しいノートブックを作成';
    }
  });
}

/**
 * 現在のタブ情報を取得
 */
async function getCurrentTab(): Promise<{ title: string; url: string }> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return {
    title: tab.title || '',
    url: tab.url || ''
  };
}

/**
 * 成功メッセージを表示
 */
function showSuccess(container: HTMLElement, notebookUrl: string) {
  container.className = 'border border-green-200 bg-green-100 rounded-md p-3';
  container.innerHTML = `
    <div class="flex items-center space-x-2">
      <div class="text-green-600">✓</div>
      <div>
        <h4 class="font-medium text-green-800">インポートが完了しました</h4>
        <a href="${notebookUrl}" target="_blank" class="text-sm text-green-600 hover:underline">
          ノートブックを開く →
        </a>
      </div>
    </div>
  `;
}

/**
 * エラーメッセージを表示
 */
function showError(container: HTMLElement, error: any) {
  container.className = 'border border-red-200 bg-red-100 rounded-md p-3';
  container.innerHTML = `
    <div class="flex items-center space-x-2">
      <div class="text-red-600">✗</div>
      <div>
        <h4 class="font-medium text-red-800">エラーが発生しました</h4>
        <p class="text-sm text-red-600">${error.message || error}</p>
      </div>
    </div>
  `;
}

/**
 * 認証エラー表示
 */
function renderAuthError(container: HTMLElement) {
  container.innerHTML = `
    <div class="w-96 h-[400px] p-4 flex flex-col justify-center items-center">
      <div class="text-center space-y-4">
        <div class="text-orange-600 text-4xl">⚠️</div>
        <h3 class="text-lg font-semibold">ログインが必要です</h3>
        <p class="text-sm text-gray-600">NotebookLMを使用するにはGoogleアカウントでログインしてください。</p>
        <a href="https://notebooklm.google.com" target="_blank" 
           class="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
          NotebookLMを開く
        </a>
      </div>
    </div>
  `;
}

/**
 * エラー表示
 */
function renderError(container: HTMLElement, error: any) {
  container.innerHTML = `
    <div class="w-96 h-[400px] p-4 flex flex-col justify-center items-center">
      <div class="text-center space-y-4">
        <div class="text-red-600 text-4xl">❌</div>
        <h3 class="text-lg font-semibold">エラーが発生しました</h3>
        <p class="text-sm text-gray-600">${error.message || error}</p>
        <button onclick="location.reload()" 
                class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
          再読み込み
        </button>
      </div>
    </div>
  `;
}