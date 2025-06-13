// Content Script - Link Extractor の実装
import type { PageLink } from '../popup/types';

export interface LinkExtractorOptions {
  excludeDomains?: string[];
  includeDomains?: string[];
  includeCurrentDomain?: boolean;
  maxLinks?: number;
}

export class LinkExtractor {
  private document: Document;
  private options: LinkExtractorOptions;

  constructor(document: Document = window.document, options: LinkExtractorOptions = {}) {
    this.document = document;
    this.options = {
      excludeDomains: [],
      includeDomains: [],
      includeCurrentDomain: true,
      maxLinks: 100,
      ...options,
    };
  }

  /**
   * ページ内の全リンクを抽出
   */
  extractLinks(): PageLink[] {
    try {
      const linkElements = this.document.querySelectorAll('a[href]');
      const links = Array.from(linkElements)
        .map(link => this.createPageLink(link))
        .filter(link => link !== null)
        .filter(link => this.shouldIncludeLink(link!))
        .slice(0, this.options.maxLinks); // 最大件数制限

      return this.removeDuplicates(links as PageLink[]);
    } catch (error) {
      console.error('Error extracting links:', error);
      return [];
    }
  }

  /**
   * HTMLAnchorElementからPageLinkオブジェクトを作成
   */
  private createPageLink(linkElement: HTMLAnchorElement): PageLink | null {
    try {
      const href = linkElement.href;
      
      if (!this.isValidLink(href)) {
        return null;
      }

      const normalizedUrl = this.normalizeUrl(href);
      const title = this.extractTitle(linkElement);
      const domain = this.extractDomain(normalizedUrl);

      return {
        url: normalizedUrl,
        title,
        domain,
      };
    } catch (error) {
      console.error('Error creating page link:', error);
      return null;
    }
  }

  /**
   * リンクが有効かどうかチェック
   */
  private isValidLink(href: string): boolean {
    if (!href || href.trim() === '') return false;
    if (href.startsWith('javascript:')) return false;
    if (href.startsWith('mailto:')) return false;
    if (href.startsWith('tel:')) return false;
    if (href.startsWith('#')) return false;
    if (href.startsWith('data:')) return false;
    
    // HTTP/HTTPSのみ許可
    return this.isHttpUrl(href);
  }

  /**
   * HTTP/HTTPS URLかどうかチェック
   */
  private isHttpUrl(url: string): boolean {
    return url.startsWith('http://') || url.startsWith('https://');
  }

  /**
   * URLを正規化（フラグメント除去、絶対URL変換）
   */
  private normalizeUrl(href: string): string {
    try {
      let url = href;

      // 相対URLを絶対URLに変換
      if (!this.isHttpUrl(url)) {
        if (url.startsWith('/')) {
          url = window.location.origin + url;
        } else if (url.startsWith('../')) {
          url = new URL(url, window.location.href).href;
        } else {
          url = new URL(url, window.location.href).href;
        }
      }

      // フラグメントを除去
      const urlObj = new URL(url);
      urlObj.hash = '';
      
      // 末尾スラッシュを正規化（ルートパス以外）
      if (urlObj.pathname.endsWith('/') && urlObj.pathname !== '/') {
        urlObj.pathname = urlObj.pathname.slice(0, -1);
      }
      
      return urlObj.toString();
    } catch (error) {
      // URL解析に失敗した場合は元のhrefを返す
      return href.split('#')[0];
    }
  }

  /**
   * リンクテキストを抽出
   */
  private extractTitle(linkElement: HTMLAnchorElement): string {
    // title属性を優先
    if (linkElement.title && linkElement.title.trim()) {
      return linkElement.title.trim();
    }

    // textContentを使用
    const textContent = linkElement.textContent?.trim();
    if (textContent && textContent !== '') {
      return textContent;
    }

    // alt属性付きの画像がある場合
    const img = linkElement.querySelector('img');
    if (img && img.alt && img.alt.trim()) {
      return img.alt.trim();
    }

    // フォールバックとしてURLを使用
    return linkElement.href;
  }

  /**
   * URLからドメインを抽出
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * リンクを含めるべきかどうかチェック
   */
  private shouldIncludeLink(link: PageLink): boolean {
    const domain = link.domain;

    // 現在のドメインを除外する場合
    if (!this.options.includeCurrentDomain && domain === window.location.hostname) {
      return false;
    }

    // 除外ドメインのチェック
    if (this.options.excludeDomains && this.options.excludeDomains.length > 0) {
      if (this.options.excludeDomains.includes(domain)) {
        return false;
      }
    }

    // 含有ドメインのチェック
    if (this.options.includeDomains && this.options.includeDomains.length > 0) {
      if (!this.options.includeDomains.includes(domain)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 重複リンクを除去
   */
  private removeDuplicates(links: PageLink[]): PageLink[] {
    const uniqueLinks = [];
    const seenUrls = new Set<string>();

    for (const link of links) {
      if (!seenUrls.has(link.url)) {
        seenUrls.add(link.url);
        uniqueLinks.push(link);
      }
    }

    return uniqueLinks;
  }

  /**
   * 現在のページ情報を取得
   */
  getCurrentPageInfo(): { url: string; title: string; domain: string } {
    return {
      url: window.location.href,
      title: document.title || window.location.href,
      domain: window.location.hostname,
    };
  }

  /**
   * リンク抽出の統計情報を取得
   */
  getExtractionStats(): {
    totalElements: number;
    validLinks: number;
    uniqueLinks: number;
    domains: string[];
  } {
    const allLinks = this.document.querySelectorAll('a[href]');
    const validLinks = Array.from(allLinks).filter(link => 
      this.isValidLink(link.href)
    );
    const uniqueUrls = new Set(validLinks.map(link => this.normalizeUrl(link.href)));
    const domains = new Set(validLinks.map(link => this.extractDomain(link.href)));

    return {
      totalElements: allLinks.length,
      validLinks: validLinks.length,
      uniqueLinks: uniqueUrls.size,
      domains: Array.from(domains),
    };
  }

  /**
   * オプションを更新
   */
  updateOptions(newOptions: Partial<LinkExtractorOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }
}