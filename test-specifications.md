# NotebookLM Chrome拡張機能 テスト仕様書

## 1. テスト戦略

### 1.1 TDD (Test-Driven Development)
1. **Red**: テストを先に書いて失敗させる
2. **Green**: テストを通すための最小限のコードを書く  
3. **Refactor**: コードを改善・整理する

### 1.2 テストレベル
- **ユニットテスト**: 個別関数・コンポーネント
- **統合テスト**: コンポーネント間連携
- **E2Eテスト**: ユーザーシナリオ全体

## 2. NotebookLMClient テストケース

### 2.1 認証関連テスト
```typescript
describe('NotebookLMClient - Authentication', () => {
  test('認証情報が正常に取得できること', async () => {
    // Given: NotebookLMページが利用可能
    // When: create()を呼び出す
    // Then: authParamsが設定されたクライアントが返される
  });

  test('ログインしていない場合エラーが発生すること', async () => {
    // Given: 未ログイン状態
    // When: create()を呼び出す
    // Then: "Please sign-in to your Google account"エラーが発生
  });

  test('ネットワークエラー時の処理', async () => {
    // Given: ネットワーク接続なし
    // When: create()を呼び出す
    // Then: 適切なエラーメッセージが返される
  });
});
```

### 2.2 ノートブック操作テスト
```typescript
describe('NotebookLMClient - Notebook Operations', () => {
  test('ノートブック一覧が正常に取得できること', async () => {
    // Given: 認証済みクライアント
    // When: listNotebooks()を呼び出す
    // Then: ノートブック配列が返される
  });

  test('空のノートブック一覧の処理', async () => {
    // Given: ノートブックが存在しないアカウント
    // When: listNotebooks()を呼び出す
    // Then: 空配列が返される
  });

  test('新規ノートブックが正常に作成できること', async () => {
    // Given: 認証済みクライアント
    // When: createNotebook("テストノート", "📔")を呼び出す
    // Then: 新しいノートブックIDが返される
  });

  test('無効なノートブック名での作成エラー', async () => {
    // Given: 認証済みクライアント
    // When: createNotebook("", "")を呼び出す
    // Then: 適切なエラーが発生
  });
});
```

### 2.3 ソース追加テスト
```typescript
describe('NotebookLMClient - Source Management', () => {
  test('通常URLの追加が正常に動作すること', async () => {
    // Given: 認証済みクライアント、有効なノートブック
    // When: addSource(notebookId, "https://example.com")を呼び出す
    // Then: ソースが正常に追加される
  });

  test('YouTube URLの追加が正常に動作すること', async () => {
    // Given: 認証済みクライアント、有効なノートブック
    // When: addSource(notebookId, "https://youtube.com/watch?v=xxx")を呼び出す
    // Then: YouTube形式でソースが追加される
  });

  test('複数URLの一括追加が正常に動作すること', async () => {
    // Given: 認証済みクライアント、URL配列
    // When: addMultipleSources(notebookId, urls)を呼び出す
    // Then: 全URLが正常に追加される
  });

  test('無効なURLの処理', async () => {
    // Given: 認証済みクライアント
    // When: addSource(notebookId, "invalid-url")を呼び出す
    // Then: 適切なエラーメッセージが返される
  });

  test('存在しないノートブックへの追加エラー', async () => {
    // Given: 認証済みクライアント
    // When: addSource("non-existent-id", "https://example.com")を呼び出す
    // Then: ノートブック不存在エラーが発生
  });
});
```

## 3. UI コンポーネント テストケース

### 3.1 メインポップアップコンポーネント
```typescript
describe('Popup Component', () => {
  test('初期状態で現在ページタブが選択されていること', () => {
    // Given: ポップアップが開かれる
    // When: 初期表示
    // Then: "現在ページ"タブがアクティブ
  });

  test('ノートブック一覧が正常に表示されること', async () => {
    // Given: NotebookLMClientがノートブックを返す
    // When: ポップアップが開かれる
    // Then: ドロップダウンにノートブックが表示される
  });

  test('ログインしていない場合のエラー表示', async () => {
    // Given: 認証エラーが発生
    // When: ポップアップが開かれる
    // Then: ログイン促進メッセージが表示される
  });

  test('現在ページインポートボタンの動作', async () => {
    // Given: ノートブックが選択されている
    // When: "ノートブックに追加"ボタンをクリック
    // Then: addSourceが呼び出される
  });

  test('新規ノートブック作成ボタンの動作', async () => {
    // Given: 現在ページが開かれている
    // When: "新しいノートブックを作成"ボタンをクリック
    // Then: createNotebook → addSourceが順次呼び出される
  });
});
```

### 3.2 リンク表示コンポーネント
```typescript
describe('LinkList Component', () => {
  test('ページ内リンクが正常に表示されること', async () => {
    // Given: 複数のリンクを含むページ
    // When: リンクタブを選択
    // Then: 抽出されたリンクがチェックボックス付きで表示される
  });

  test('リンクの選択・選択解除が動作すること', () => {
    // Given: リンク一覧が表示されている
    // When: チェックボックスをクリック
    // Then: 選択状態が切り替わる
  });

  test('全選択ボタンの動作', () => {
    // Given: 複数のリンクが表示されている
    // When: "全選択"ボタンをクリック
    // Then: 全リンクが選択状態になる
  });

  test('全解除ボタンの動作', () => {
    // Given: 複数のリンクが選択されている
    // When: "全解除"ボタンをクリック
    // Then: 全リンクの選択が解除される
  });

  test('選択したリンクの一括インポート', async () => {
    // Given: 複数のリンクが選択されている
    // When: "選択したX件をインポート"ボタンをクリック
    // Then: addMultipleSourcesが呼び出される
  });

  test('リンクが存在しないページの処理', async () => {
    // Given: リンクが存在しないページ
    // When: リンクタブを選択
    // Then: "リンクが見つかりません"メッセージが表示される
  });
});
```

### 3.3 ノートブック選択コンポーネント
```typescript
describe('NotebookSelector Component', () => {
  test('ノートブック一覧がドロップダウンに表示されること', () => {
    // Given: 複数のノートブックが存在
    // When: セレクターを開く
    // Then: 全ノートブックがタイトル付きで表示される
  });

  test('ノートブックの選択が正常に動作すること', () => {
    // Given: ノートブック一覧が表示されている
    // When: ノートブックを選択
    // Then: 選択されたノートブックが表示される
  });

  test('デフォルトで最初のノートブックが選択されること', () => {
    // Given: 複数のノートブックが存在
    // When: 初期表示
    // Then: 最初のノートブックが自動選択される
  });

  test('検索機能が正常に動作すること', () => {
    // Given: 多数のノートブックが存在
    // When: 検索テキストを入力
    // Then: マッチするノートブックのみ表示される
  });
});
```

## 4. Content Script テストケース

### 4.1 リンク抽出機能
```typescript
describe('Link Extractor', () => {
  test('ページ内の全リンクが正常に抽出されること', () => {
    // Given: 複数のaタグを含むHTMLページ
    // When: extractLinks()を呼び出す
    // Then: 全リンクのURL・タイトルが配列で返される
  });

  test('相対URLが絶対URLに変換されること', () => {
    // Given: 相対URLを含むページ
    // When: extractLinks()を呼び出す
    // Then: 絶対URLに変換されて返される
  });

  test('無効なリンクが除外されること', () => {
    // Given: javascript:void(0)やmailto:を含むページ
    // When: extractLinks()を呼び出す
    // Then: HTTPSまたはHTTPリンクのみが返される
  });

  test('重複リンクが除去されること', () => {
    // Given: 同一URLの複数リンクを含むページ
    // When: extractLinks()を呼び出す
    // Then: 重複が除去されたユニークなリンクが返される
  });

  test('フラグメント識別子が除去されること', () => {
    // Given: #section付きのリンクを含むページ
    // When: extractLinks()を呼び出す
    // Then: フラグメント部分が除去されたURLが返される
  });

  test('リンクテキストが正常に取得されること', () => {
    // Given: テキストを含むaタグ
    // When: extractLinks()を呼び出す
    // Then: リンクテキストが正しく取得される
  });
});
```

## 5. ユーティリティ テストケース

### 5.1 タブ操作ユーティリティ
```typescript
describe('Tab Utils', () => {
  test('アクティブタブの情報が正常に取得できること', async () => {
    // Given: Chromeでタブが開かれている
    // When: getCurrentTab()を呼び出す
    // Then: URL・タイトルが返される
  });

  test('権限が不足している場合のエラー処理', async () => {
    // Given: activeTab権限がない状態
    // When: getCurrentTab()を呼び出す
    // Then: 適切なエラーメッセージが返される
  });

  test('URLの正規化が正常に動作すること', () => {
    // Given: 様々な形式のURL
    // When: normalizeUrl()を呼び出す
    // Then: 統一された形式のURLが返される
  });
});
```

## 6. 統合テストケース

### 6.1 エンドツーエンドワークフロー
```typescript
describe('E2E Workflow', () => {
  test('現在ページインポートの完全フロー', async () => {
    // Given: NotebookLMにログイン済み、Webページが開かれている
    // When: 拡張機能を開いて現在ページをインポート
    // Then: NotebookLMにソースが追加され、成功メッセージが表示される
  });

  test('新規ノートブック作成の完全フロー', async () => {
    // Given: NotebookLMにログイン済み
    // When: 新規ノートブック作成ボタンをクリック
    // Then: 新しいノートブックが作成され、現在ページが追加される
  });

  test('リンク一括インポートの完全フロー', async () => {
    // Given: 複数リンクを含むページ、ノートブック選択済み
    // When: リンクを選択して一括インポート
    // Then: 選択した全リンクがノートブックに追加される
  });
});
```

### 6.2 エラーシナリオテスト
```typescript
describe('Error Scenarios', () => {
  test('ネットワークエラー時の処理', async () => {
    // Given: ネットワーク接続なし
    // When: ノートブック操作を実行
    // Then: 適切なエラーメッセージが表示される
  });

  test('NotebookLMセッション期限切れの処理', async () => {
    // Given: セッションが期限切れ
    // When: API操作を実行
    // Then: 再ログイン促進メッセージが表示される
  });

  test('不正なページでの動作', async () => {
    // Given: chrome://やfile://などの特殊ページ
    // When: 拡張機能を使用
    // Then: 適切な制限メッセージが表示される
  });
});
```

## 7. パフォーマンステスト

### 7.1 応答時間テスト
```typescript
describe('Performance Tests', () => {
  test('ポップアップの初期表示時間', async () => {
    // Given: 拡張機能がインストール済み
    // When: ツールバーアイコンをクリック
    // Then: 1秒以内にポップアップが表示される
  });

  test('大量リンクの抽出・表示時間', async () => {
    // Given: 100個以上のリンクを含むページ
    // When: リンクタブを選択
    // Then: 3秒以内にリンク一覧が表示される
  });

  test('一括インポートの処理時間', async () => {
    // Given: 10個のリンクが選択済み
    // When: 一括インポートを実行
    // Then: 30秒以内に全て完了する
  });
});
```

## 8. テスト実行計画

### 8.1 ユニットテスト (TDD)
1. **NotebookLMClient**: API関連機能のテスト
2. **UI Components**: React コンポーネントのテスト
3. **Utils**: ユーティリティ関数のテスト
4. **Content Script**: リンク抽出機能のテスト

### 8.2 統合テスト
1. **Chrome APIs**: chrome.tabs等の連携テスト
2. **Component Integration**: コンポーネント間連携テスト

### 8.3 E2Eテスト
1. **User Workflows**: 実際のユーザーシナリオテスト
2. **Error Handling**: エラーケースの確認

### 8.4 テストツール
- **Vitest**: ユニットテスト・統合テスト
- **@testing-library/react**: Reactコンポーネントテスト
- **MSW**: APIモック
- **Puppeteer**: E2Eテスト（Chrome拡張機能用）

---

**作成日**: 2025年6月10日  
**バージョン**: 1.0  
**ステータス**: テスト駆動開発準備完了