// Content Script Entry Point - NotebookLM Importerに準じた実装
import { LinkExtractor } from './LinkExtractor';

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'extractLinks':
      handleExtractLinks(request, sendResponse);
      break;
    case 'getCurrentPageInfo':
      handleGetCurrentPageInfo(sendResponse);
      break;
    case 'addCurrentPageToNotebook':
      handleAddCurrentPage(request, sendResponse);
      break;
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  // 非同期レスポンスのためtrueを返す
  return true;
});

/**
 * リンク抽出処理
 */
function handleExtractLinks(request: any, sendResponse: (response: any) => void) {
  try {
    const options = request.data || {};
    const extractor = new LinkExtractor(document, options);
    const links = extractor.extractLinks();
    const stats = extractor.getExtractionStats();
    
    sendResponse({
      success: true,
      links,
      stats,
      pageInfo: extractor.getCurrentPageInfo(),
    });
  } catch (error: any) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 現在のページ情報取得
 */
function handleGetCurrentPageInfo(sendResponse: (response: any) => void) {
  try {
    const extractor = new LinkExtractor(document);
    const pageInfo = extractor.getCurrentPageInfo();
    
    sendResponse({
      success: true,
      pageInfo,
    });
  } catch (error: any) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

/**
 * 現在のページをノートブックに追加
 */
function handleAddCurrentPage(request: any, sendResponse: (response: any) => void) {
  try {
    const pageInfo = {
      url: window.location.href,
      title: document.title || window.location.href,
      domain: window.location.hostname,
    };
    
    // メタデータを収集
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
    
    sendResponse({
      success: true,
      pageInfo: {
        ...pageInfo,
        description: metaDescription,
        keywords: metaKeywords,
      },
    });
  } catch (error: any) {
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// ページ読み込み完了時に通知
if (document.readyState === 'complete') {
  notifyPageReady();
} else {
  window.addEventListener('load', notifyPageReady);
}

function notifyPageReady() {
  // バックグラウンドスクリプトに通知
  chrome.runtime.sendMessage({
    action: 'pageReady',
    url: window.location.href,
    title: document.title,
  });
}

// エラーハンドリング
window.addEventListener('error', (event) => {
  console.error('Content script error:', event.error);
});