import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NotebookLMClient } from './NotebookLMClient';
import type { AuthParams, Notebook } from './types';

describe('NotebookLMClient - Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('認証情報が正常に取得できること', async () => {
    // Given: NotebookLMページが利用可能で認証情報が含まれている
    const mockResponse = `
      <html>
        <script>
          window.WIZ_global_data = {"SNlM0e":"test-at-token","cfb2h":"test-bl-token"};
        </script>
      </html>
    `;
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockResponse),
    });

    // When: create()を呼び出す
    const client = await NotebookLMClient.create();

    // Then: authParamsが設定されたクライアントが返される
    expect(client).toBeInstanceOf(NotebookLMClient);
    expect(client.authParams).toEqual({
      at: 'test-at-token',
      bl: 'test-bl-token',
    });
  });

  test('ログインしていない場合エラーが発生すること', async () => {
    // Given: 認証情報が含まれていないレスポンス
    const mockResponse = '<html><body>Please sign in</body></html>';
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockResponse),
    });

    // When & Then: create()でエラーが発生
    await expect(NotebookLMClient.create()).rejects.toThrow(
      'Please sign-in to your Google account to use NotebookLM'
    );
  });

  test('ネットワークエラー時の処理', async () => {
    // Given: ネットワーク接続なし
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    // When & Then: 適切なエラーメッセージが返される
    await expect(NotebookLMClient.create()).rejects.toThrow('Network error');
  });
});

describe('NotebookLMClient - Notebook Operations', () => {
  let client: NotebookLMClient;
  let mockAuthParams: AuthParams;

  beforeEach(() => {
    mockAuthParams = { at: 'test-at', bl: 'test-bl' };
    client = new NotebookLMClient(mockAuthParams);
    vi.clearAllMocks();
  });

  test('ノートブック一覧が正常に取得できること', async () => {
    // Given: 認証済みクライアントとモックレスポンス
    const mockNotebooks = [
      ['テストノート1', null, 'nb-123', '📔', null, [null, 1234567890]],
      ['テストノート2', null, 'nb-456', '📚', null, [null, 1234567891]],
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(`)]}'
[["wrb.fr",null,null,null,null,[1]],["wrb.fr","rpc-id",${JSON.stringify([mockNotebooks])},null,null,"generic"]]`),
    });

    // When: listNotebooks()を呼び出す
    const notebooks = await client.listNotebooks();

    // Then: ノートブック配列が返される
    expect(notebooks).toHaveLength(2);
    expect(notebooks[0]).toEqual({
      id: 'nb-123',
      title: 'テストノート1',
      emoji: '📔',
    });
    expect(notebooks[1]).toEqual({
      id: 'nb-456',
      title: 'テストノート2',
      emoji: '📚',
    });
  });

  test('空のノートブック一覧の処理', async () => {
    // Given: 空のノートブック配列
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(`)]}'
[["wrb.fr",null,null,null,null,[1]],["wrb.fr","rpc-id",${JSON.stringify([[]])},null,null,"generic"]]`),
    });

    // When: listNotebooks()を呼び出す
    const notebooks = await client.listNotebooks();

    // Then: 空配列が返される
    expect(notebooks).toEqual([]);
  });

  test('新規ノートブックが正常に作成できること', async () => {
    // Given: 認証済みクライアント
    const mockResponse = `)]}'
[["wrb.fr",null,null,null,null,[1]],["wrb.fr","rpc-id",${JSON.stringify([null, null, "new-notebook-id"])},null,null,"generic"]]`;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockResponse),
    });

    // When: createNotebook()を呼び出す
    const result = await client.createNotebook('テストノート', '📔');

    // Then: 新しいノートブックIDが返される
    expect(result).toEqual({ id: 'new-notebook-id' });
  });

  test('無効なノートブック名での作成エラー', async () => {
    // Given: APIがエラーを返す
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    // When & Then: 適切なエラーが発生
    await expect(client.createNotebook('', '')).rejects.toThrow();
  });
});

describe('NotebookLMClient - Source Management', () => {
  let client: NotebookLMClient;
  let mockAuthParams: AuthParams;

  beforeEach(() => {
    mockAuthParams = { at: 'test-at', bl: 'test-bl' };
    client = new NotebookLMClient(mockAuthParams);
    vi.clearAllMocks();
  });

  test('通常URLの追加が正常に動作すること', async () => {
    // Given: 認証済みクライアント、有効なノートブック
    const mockResponse = `)]}'
[["wrb.fr",null,null,null,null,[1]],["wrb.fr","rpc-id",${JSON.stringify(['success'])},null,null,"generic"]]`;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockResponse),
    });

    // When: addSource()を呼び出す
    const result = await client.addSource('notebook-id', 'https://example.com');

    // Then: ソースが正常に追加される
    expect(result).toEqual(['success']);
  });

  test('YouTube URLの追加が正常に動作すること', async () => {
    // Given: 認証済みクライアント、YouTube URL
    const mockResponse = `)]}'
[["wrb.fr",null,null,null,null,[1]],["wrb.fr","rpc-id",${JSON.stringify(['success'])},null,null,"generic"]]`;

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockResponse),
    });

    // When: YouTube URLでaddSource()を呼び出す
    const result = await client.addSource('notebook-id', 'https://youtube.com/watch?v=abc123');

    // Then: YouTube形式でソースが追加される
    expect(result).toEqual(['success']);
    
    // リクエストボディを確認
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[1].body).toContain('youtube.com');
  });

  test('複数URLの一括追加が正常に動作すること', async () => {
    // Given: 認証済みクライアント、URL配列
    const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
    
    // 各URLの追加をモック
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`)]}'[["wrb.fr","rpc-id",["success1"],null,null,"generic"]]`),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`)]}'[["wrb.fr","rpc-id",["success2"],null,null,"generic"]]`),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(`)]}'[["wrb.fr","rpc-id",["success3"],null,null,"generic"]]`),
      });

    // When: addMultipleSources()を呼び出す
    const results = await client.addMultipleSources('notebook-id', urls);

    // Then: 全URLが正常に追加される
    expect(results).toHaveLength(3);
    expect(results).toEqual([['success1'], ['success2'], ['success3']]);
  });

  test('無効なURLの処理', async () => {
    // Given: 認証済みクライアント
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    // When & Then: 適切なエラーメッセージが返される
    await expect(client.addSource('notebook-id', 'invalid-url')).rejects.toThrow();
  });

  test('存在しないノートブックへの追加エラー', async () => {
    // Given: 認証済みクライアント
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    // When & Then: ノートブック不存在エラーが発生
    await expect(client.addSource('non-existent-id', 'https://example.com')).rejects.toThrow();
  });
});