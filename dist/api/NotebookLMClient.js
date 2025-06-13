import type { AuthParams, Notebook, RPCRequest, RPCResponse, CreateNotebookResponse } from './types';

export class NotebookLMClient {
  public authParams: AuthParams;

  constructor(authParams: AuthParams) {
    this.authParams = authParams;
  }

  /**
   * NotebookLMページから認証情報を取得してクライアントを作成
   */
  static async create(): Promise<NotebookLMClient> {
    try {
      const response = await fetch('https://notebooklm.google.com/', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      
      // 認証トークンを抽出
      const atToken = this.extractToken('SNlM0e', html);
      const blToken = this.extractToken('cfb2h', html);

      if (!atToken || !blToken) {
        throw new Error('Please sign-in to your Google account to use NotebookLM');
      }

      return new NotebookLMClient({
        at: atToken,
        bl: blToken,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create NotebookLM client');
    }
  }

  /**
   * HTMLからトークンを抽出するヘルパーメソッド
   */
  private static extractToken(key: string, html: string): string | undefined {
    const regex = new RegExp(`"${key}":"([^"]+)"`);
    const match = regex.exec(html);
    return match?.[1];
  }

  /**
   * NotebookLMの内部RPC APIを実行
   */
  async execute(rpcs: RPCRequest[]): Promise<RPCResponse[]> {
    const url = new URL('https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute');
    url.searchParams.set('rpcids', rpcs.map(rpc => rpc.id).join(','));
    url.searchParams.set('bl', this.authParams.bl);

    const body = new FormData();
    body.append('at', this.authParams.at);
    body.append('f.req', JSON.stringify(rpcs.map(rpc => [rpc.id, JSON.stringify(rpc.args)])));

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: body,
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`RPC failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    return this.parseRPCResponse(text);
  }

  /**
   * RPC レスポンスをパース
   */
  private parseRPCResponse(text: string): RPCResponse[] {
    // ")]}'\\n" プレフィックスを除去
    const cleanText = text.slice(text.indexOf('\n') + 1);
    const parsed = JSON.parse(cleanText);
    
    const results: RPCResponse[] = [];
    for (const item of parsed) {
      if (item[0] !== 'wrb.fr') continue;
      
      let index: number;
      if (item[6] === 'generic') {
        index = 1;
      } else {
        index = parseInt(item[6], 10);
      }

      results.push({
        index,
        rpcId: item[1],
        data: JSON.parse(item[2]),
      });
    }

    return results;
  }

  /**
   * ノートブック一覧を取得
   */
  async listNotebooks(): Promise<Notebook[]> {
    const responses = await this.execute([
      { id: 'wXbhsf', args: [null, 1] }
    ]);

    const notebooks = responses[0].data[0];
    if (!notebooks || notebooks.length === 0) {
      return [];
    }

    // 作成日時でソート（新しい順）
    notebooks.sort((a: any, b: any) => b[5][1] - a[5][1]);

    return notebooks.map((notebook: any) => ({
      id: notebook[2],
      title: notebook[0] || 'Untitled',
      emoji: notebook[3],
    }));
  }

  /**
   * 新規ノートブックを作成
   */
  async createNotebook(title: string, emoji: string): Promise<CreateNotebookResponse> {
    const responses = await this.execute([
      { id: 'CCqFvf', args: [title, emoji] }
    ]);

    return {
      id: responses[0].data[2],
    };
  }

  /**
   * ノートブックにソースを追加
   */
  async addSource(notebookId: string, url: string): Promise<any> {
    const sourceData = this.createSourceData(url);

    const responses = await this.execute([
      { id: 'izAoDd', args: [[sourceData], notebookId] }
    ]);

    return responses[0].data;
  }

  /**
   * URLの形式に応じてソースデータを作成
   */
  private createSourceData(url: string): any[] {
    // YouTube URLかどうかで形式を変更
    if (this.isYouTubeUrl(url)) {
      return [null, null, null, null, null, null, null, [url]];  // YouTube形式
    }
    return [null, null, [url]];  // 通常のURL形式
  }

  /**
   * YouTube URLかどうかを判定
   */
  private isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }

  /**
   * 複数のソースを一括追加
   */
  async addMultipleSources(notebookId: string, urls: string[]): Promise<any[]> {
    const promises = urls.map(url => this.addSource(notebookId, url));
    return Promise.all(promises);
  }
}