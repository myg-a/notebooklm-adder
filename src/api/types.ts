// NotebookLM API の型定義

export interface AuthParams {
  at: string;  // 認証トークン
  bl: string;  // セッショントークン
}

export interface Notebook {
  id: string;
  title: string;
  emoji: string;
}

export interface RPCRequest {
  id: string;
  args: unknown[];
}

export interface RPCResponse {
  index: number;
  rpcId: string;
  data: unknown;
}

export interface CreateNotebookResponse {
  id: string;
}