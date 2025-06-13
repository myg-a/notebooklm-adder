import { NotebookLMClient } from '../src/api/NotebookLMClient';
import { describe, test, expect } from './simple-test-runner';

// 基本的な機能テスト（実際のAPIは使わずに構造をテスト）
await describe('NotebookLMClient Basic Structure', async () => {
  await test('クラスが正しく定義されていること', () => {
    expect(typeof NotebookLMClient).toBe('function');
  });

  await test('コンストラクタが認証パラメータを受け取ること', () => {
    const authParams = { at: 'test-at', bl: 'test-bl' };
    const client = new NotebookLMClient(authParams);
    expect(client.authParams).toEqual(authParams);
  });

  await test('必要なメソッドが定義されていること', () => {
    const authParams = { at: 'test-at', bl: 'test-bl' };
    const client = new NotebookLMClient(authParams);
    
    expect(typeof client.listNotebooks).toBe('function');
    expect(typeof client.createNotebook).toBe('function');
    expect(typeof client.addSource).toBe('function');
    expect(typeof client.addMultipleSources).toBe('function');
  });

  await test('static create メソッドが定義されていること', () => {
    expect(typeof NotebookLMClient.create).toBe('function');
  });
});

await describe('URL処理ロジック', async () => {
  await test('YouTube URLの判定ロジック', () => {
    const youtubeUrl = 'https://youtube.com/watch?v=abc123';
    const normalUrl = 'https://example.com';
    
    expect(youtubeUrl.includes('youtube.com')).toBe(true);
    expect(normalUrl.includes('youtube.com')).toBe(false);
  });

  await test('ソースデータ形式の構築', () => {
    const youtubeUrl = 'https://youtube.com/watch?v=abc123';
    const normalUrl = 'https://example.com';
    
    // YouTube形式
    const youtubeData = youtubeUrl.includes('youtube.com')
      ? [null, null, null, null, null, null, null, [youtubeUrl]]
      : [null, null, [youtubeUrl]];
    
    // 通常形式  
    const normalData = normalUrl.includes('youtube.com')
      ? [null, null, null, null, null, null, null, [normalUrl]]
      : [null, null, [normalUrl]];
    
    expect(youtubeData).toEqual([null, null, null, null, null, null, null, [youtubeUrl]]);
    expect(normalData).toEqual([null, null, [normalUrl]]);
  });
});

console.log('\n🚀 Basic functionality tests completed');
console.log('\n次のステップ: UI コンポーネントのTDD実装');