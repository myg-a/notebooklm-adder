// Chrome APIs 連携ユーティリティ

export interface TabInfo {
  id: number;
  title: string;
  url: string;
  favIconUrl?: string;
}

export interface AllTabInfo {
  id: number;
  title: string;
  url: string;
  active: boolean;
}

export class TabUtils {
  /**
   * アクティブなタブの情報を取得
   */
  static async getCurrentTab(): Promise<TabInfo> {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      
      const tab = tabs[0];
      return {
        id: tab.id!,
        title: tab.title || tab.url!,
        url: tab.url!,
        favIconUrl: tab.favIconUrl,
      };
    } catch (error) {
      throw new Error(`Failed to get current tab: ${error.message}`);
    }
  }

  /**
   * 全てのタブの情報を取得
   */
  static async getAllTabs(): Promise<AllTabInfo[]> {
    try {
      const tabs = await chrome.tabs.query({});
      return tabs.map(tab => ({
        id: tab.id!,
        title: tab.title || tab.url!,
        url: tab.url!,
        active: tab.active,
      }));
    } catch (error) {
      throw new Error(`Failed to get all tabs: ${error.message}`);
    }
  }
}

export class URLUtils {
  /**
   * URLを正規化
   */
  static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // フラグメントを除去
      urlObj.hash = '';
      
      // 末尾スラッシュを正規化
      if (urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      
      return urlObj.toString();
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  /**
   * 有効なWebURLかどうかチェック
   */
  static isValidWebUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * URLからドメインを抽出
   */
  static extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }
}

export class MessageHandler {
  /**
   * コンテンツスクリプトにメッセージを送信
   */
  static async sendToContentScript(tabId: number, action: string, data: any = {}): Promise<any> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action,
        data,
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to send message to content script: ${error.message}`);
    }
  }

  /**
   * バックグラウンドスクリプトにメッセージを送信
   */
  static async sendToBackground(action: string, data: any = {}): Promise<any> {
    try {
      const response = await chrome.runtime.sendMessage({
        action,
        data,
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to send message to background: ${error.message}`);
    }
  }

  /**
   * タブからリンクを抽出
   */
  static async extractLinksFromTab(tabId: number): Promise<any[]> {
    const response = await this.sendToContentScript(tabId, 'extractLinks');
    if (response.success) {
      return response.links;
    }
    throw new Error('Failed to extract links');
  }
}

export class StorageUtils {
  /**
   * ストレージから値を取得
   */
  static async get(key: string): Promise<any> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] === undefined ? null : result[key];
    } catch (error) {
      throw new Error(`Failed to get storage item: ${error.message}`);
    }
  }

  /**
   * ストレージに値を保存
   */
  static async set(key: string, value: any): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      throw new Error(`Failed to set storage item: ${error.message}`);
    }
  }

  /**
   * ストレージから値を削除
   */
  static async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      throw new Error(`Failed to remove storage item: ${error.message}`);
    }
  }

  /**
   * 複数のアイテムを取得
   */
  static async getMultiple(keys: string[]): Promise<Record<string, any>> {
    try {
      const result = await chrome.storage.local.get(keys);
      return result;
    } catch (error) {
      throw new Error(`Failed to get multiple storage items: ${error.message}`);
    }
  }
}

export interface UserSettings {
  autoAudioOverview: boolean;
  excludeDomains: string[];
  maxLinksPerPage: number;
  defaultNotebook: string | null;
}

export class SettingsManager {
  /**
   * 設定を保存
   */
  static async saveSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.local.set({ userSettings: settings });
  }

  /**
   * 設定を読み込み
   */
  static async loadSettings(): Promise<UserSettings> {
    const result = await chrome.storage.local.get('userSettings');
    return result.userSettings || this.getDefaultSettings();
  }

  /**
   * デフォルト設定を取得
   */
  static getDefaultSettings(): UserSettings {
    return {
      autoAudioOverview: false,
      excludeDomains: [],
      maxLinksPerPage: 100,
      defaultNotebook: null,
    };
  }
}