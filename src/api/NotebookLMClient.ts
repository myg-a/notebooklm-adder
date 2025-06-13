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
    // RPCリクエストのURL構築（NotebookLM Importerに準拠）
    const { url, headers, body } = await this.buildRPCRequest({
      host: 'notebooklm.google.com',
      app: 'LabsTailwindUi',
      rpcs: rpcs
    });

    // blパラメータをURLに追加
    url.searchParams.append('bl', this.authParams.bl);
    // atパラメータをボディに追加
    body.append('at', this.authParams.at);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: headers,
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
   * RPCリクエストを構築（NotebookLM Importerの方式に準拠）
   */
  private async buildRPCRequest(config: {
    host: string;
    app: string;
    rpcs: RPCRequest[];
  }): Promise<{ url: URL; headers: HeadersInit; body: FormData }> {
    const url = new URL(`https://${config.host}/_/${config.app}/data/batchexecute`);
    const rpcIds = config.rpcs.map(rpc => rpc.id).join(',');
    url.searchParams.set('rpcids', rpcIds);

    const headers: HeadersInit = {
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    };

    const body = new FormData();
    const requestData = config.rpcs.map(rpc => [rpc.id, JSON.stringify(rpc.args)]);
    body.append('f.req', JSON.stringify(requestData));

    return { url, headers, body };
  }

  /**
   * RPC レスポンスをパース（NotebookLM Importerに準拠）
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
      id: (responses[0].data as any)[2],
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

    return (responses[0].data as any);
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
   * アカウント情報を取得
   */
  async getAccount(): Promise<{ language: string }> {
    const responses = await this.execute([
      { id: 'ZwVcOc', args: [] }
    ]);

    return {
      language: (responses[0].data as any)[0][2].at(-1)[0]
    };
  }

  /**
   * 音声概要を作成
   */
  async createAudioOverview(notebookId: string): Promise<any> {
    const account = await this.getAccount();
    
    const responses = await this.execute([
      { id: 'AHyHrd', args: [notebookId, 0, [null, null, null, [], account.language]] }
    ]);

    return (responses[0].data as any);
  }

  /**
   * 複数のソースを一括追加
   */
  async addMultipleSources(notebookId: string, urls: string[]): Promise<any[]> {
    const promises = urls.map(url => this.addSource(notebookId, url));
    return Promise.all(promises);
  }
}