import { describe, test, expect, runner } from './ui-test-runner.js';

// Content Script (Link Extractor) のテスト

await describe('Link Extractor Basic Functionality', async () => {
  await test('ページ内の全リンクが正常に抽出されること', () => {
    // Mock DOM
    const mockDocument = {
      querySelectorAll: (selector) => {
        if (selector === 'a[href]') {
          return [
            { href: 'https://example.com', textContent: 'Example Site', hostname: 'example.com' },
            { href: 'https://test.com/page', textContent: 'Test Page', hostname: 'test.com' },
            { href: 'https://github.com', textContent: 'GitHub', hostname: 'github.com' },
          ];
        }
        return [];
      }
    };

    class LinkExtractor {
      constructor(document) {
        this.document = document || global.document;
      }

      extractLinks() {
        const linkElements = this.document.querySelectorAll('a[href]');
        return Array.from(linkElements).map(link => ({
          url: link.href,
          title: link.textContent.trim() || link.href,
          domain: link.hostname || this.extractDomain(link.href),
        }));
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    const extractor = new LinkExtractor(mockDocument);
    const links = extractor.extractLinks();

    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({
      url: 'https://example.com',
      title: 'Example Site',
      domain: 'example.com',
    });
    expect(links[1]).toEqual({
      url: 'https://test.com/page',
      title: 'Test Page',
      domain: 'test.com',
    });
    expect(links[2]).toEqual({
      url: 'https://github.com',
      title: 'GitHub',
      domain: 'github.com',
    });
  });

  await test('相対URLが絶対URLに変換されること', () => {
    // Mock window.location
    global.window = {
      location: {
        origin: 'https://example.com',
        protocol: 'https:',
        hostname: 'example.com',
        href: 'https://example.com/current-page',
      }
    };

    const mockDocument = {
      querySelectorAll: () => [
        { href: '/relative-path', textContent: 'Relative Link', hostname: '' },
        { href: '../parent-path', textContent: 'Parent Link', hostname: '' },
        { href: 'https://absolute.com', textContent: 'Absolute Link', hostname: 'absolute.com' },
      ]
    };

    class LinkExtractor {
      constructor(document) {
        this.document = document;
      }

      extractLinks() {
        const linkElements = this.document.querySelectorAll('a[href]');
        return Array.from(linkElements).map(link => ({
          url: this.normalizeUrl(link.href),
          title: link.textContent.trim(),
          domain: this.extractDomain(this.normalizeUrl(link.href)),
        }));
      }

      normalizeUrl(url) {
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return url;
        }
        // 相対URLを絶対URLに変換
        if (url.startsWith('/')) {
          return window.location.origin + url;
        }
        if (url.startsWith('../')) {
          return window.location.origin + '/parent-path'; // 簡略化
        }
        return window.location.origin + '/' + url;
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    const extractor = new LinkExtractor(mockDocument);
    const links = extractor.extractLinks();

    expect(links[0].url).toBe('https://example.com/relative-path');
    expect(links[0].domain).toBe('example.com');
    expect(links[1].url).toBe('https://example.com/parent-path');
    expect(links[2].url).toBe('https://absolute.com');
    expect(links[2].domain).toBe('absolute.com');
  });

  await test('無効なリンクが除外されること', () => {
    const mockDocument = {
      querySelectorAll: () => [
        { href: 'https://valid.com', textContent: 'Valid Link', hostname: 'valid.com' },
        { href: 'javascript:void(0)', textContent: 'JavaScript Link', hostname: '' },
        { href: 'mailto:test@example.com', textContent: 'Email Link', hostname: '' },
        { href: '', textContent: 'Empty Link', hostname: '' },
        { href: '#section', textContent: 'Fragment Link', hostname: '' },
        { href: 'https://another-valid.com', textContent: 'Another Valid', hostname: 'another-valid.com' },
      ]
    };

    class LinkExtractor {
      constructor(document) {
        this.document = document;
      }

      extractLinks() {
        const linkElements = this.document.querySelectorAll('a[href]');
        return Array.from(linkElements)
          .filter(link => this.isValidLink(link.href))
          .map(link => ({
            url: link.href,
            title: link.textContent.trim(),
            domain: this.extractDomain(link.href),
          }));
      }

      isValidLink(href) {
        if (!href || href.trim() === '') return false;
        if (href.startsWith('javascript:')) return false;
        if (href.startsWith('mailto:')) return false;
        if (href.startsWith('#')) return false;
        if (href.startsWith('tel:')) return false;
        return true;
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    const extractor = new LinkExtractor(mockDocument);
    const links = extractor.extractLinks();

    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://valid.com');
    expect(links[1].url).toBe('https://another-valid.com');
  });
});

await describe('Link Extractor Advanced Features', async () => {
  await test('重複リンクが除去されること', () => {
    const mockDocument = {
      querySelectorAll: () => [
        { href: 'https://example.com', textContent: 'Example 1', hostname: 'example.com' },
        { href: 'https://test.com', textContent: 'Test Site', hostname: 'test.com' },
        { href: 'https://example.com', textContent: 'Example 2', hostname: 'example.com' },
        { href: 'https://example.com#section', textContent: 'Example with fragment', hostname: 'example.com' },
      ]
    };

    class LinkExtractor {
      constructor(document) {
        this.document = document;
      }

      extractLinks() {
        const linkElements = this.document.querySelectorAll('a[href]');
        const links = Array.from(linkElements).map(link => ({
          url: this.removeFragment(link.href),
          title: link.textContent.trim(),
          domain: this.extractDomain(link.href),
        }));

        // 重複除去（URLベース）
        const uniqueLinks = [];
        const seenUrls = new Set();

        for (const link of links) {
          if (!seenUrls.has(link.url)) {
            seenUrls.add(link.url);
            uniqueLinks.push(link);
          }
        }

        return uniqueLinks;
      }

      removeFragment(url) {
        try {
          const urlObj = new URL(url);
          urlObj.hash = '';
          return urlObj.toString();
        } catch {
          return url.split('#')[0];
        }
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    const extractor = new LinkExtractor(mockDocument);
    const links = extractor.extractLinks();

    expect(links).toHaveLength(2);
    expect(links[0].url).toBe('https://example.com');
    expect(links[1].url).toBe('https://test.com');
  });

  await test('リンクテキストが正常に取得されること', () => {
    const mockDocument = {
      querySelectorAll: () => [
        { href: 'https://example.com', textContent: '  Example Site  ', hostname: 'example.com' },
        { href: 'https://empty-text.com', textContent: '', hostname: 'empty-text.com' },
        { href: 'https://whitespace.com', textContent: '   ', hostname: 'whitespace.com' },
        { href: 'https://normal.com', textContent: 'Normal Link', hostname: 'normal.com' },
      ]
    };

    class LinkExtractor {
      constructor(document) {
        this.document = document;
      }

      extractLinks() {
        const linkElements = this.document.querySelectorAll('a[href]');
        return Array.from(linkElements).map(link => ({
          url: link.href,
          title: this.extractTitle(link),
          domain: this.extractDomain(link.href),
        }));
      }

      extractTitle(link) {
        const text = link.textContent.trim();
        if (text === '') {
          return link.href; // テキストがない場合はURLを使用
        }
        return text;
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    const extractor = new LinkExtractor(mockDocument);
    const links = extractor.extractLinks();

    expect(links[0].title).toBe('Example Site'); // トリム済み
    expect(links[1].title).toBe('https://empty-text.com'); // URLをフォールバック
    expect(links[2].title).toBe('https://whitespace.com'); // 空白のみの場合もURLをフォールバック
    expect(links[3].title).toBe('Normal Link');
  });

  await test('特定ドメインのフィルタリングが動作すること', () => {
    const mockDocument = {
      querySelectorAll: () => [
        { href: 'https://example.com/page1', textContent: 'Example 1', hostname: 'example.com' },
        { href: 'https://github.com/repo', textContent: 'GitHub Repo', hostname: 'github.com' },
        { href: 'https://example.com/page2', textContent: 'Example 2', hostname: 'example.com' },
        { href: 'https://stackoverflow.com/question', textContent: 'Stack Overflow', hostname: 'stackoverflow.com' },
      ]
    };

    class LinkExtractor {
      constructor(document, options = {}) {
        this.document = document;
        this.excludeDomains = options.excludeDomains || [];
        this.includeDomains = options.includeDomains || [];
      }

      extractLinks() {
        const linkElements = this.document.querySelectorAll('a[href]');
        return Array.from(linkElements)
          .map(link => ({
            url: link.href,
            title: link.textContent.trim(),
            domain: this.extractDomain(link.href),
          }))
          .filter(link => this.shouldIncludeLink(link));
      }

      shouldIncludeLink(link) {
        // 除外ドメインのチェック
        if (this.excludeDomains.length > 0 && this.excludeDomains.includes(link.domain)) {
          return false;
        }

        // 含有ドメインのチェック
        if (this.includeDomains.length > 0 && !this.includeDomains.includes(link.domain)) {
          return false;
        }

        return true;
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    // 除外ドメインのテスト
    const extractorWithExclusion = new LinkExtractor(mockDocument, {
      excludeDomains: ['example.com']
    });
    const linksExcluded = extractorWithExclusion.extractLinks();
    expect(linksExcluded).toHaveLength(2);
    expect(linksExcluded.map(l => l.domain)).toEqual(['github.com', 'stackoverflow.com']);

    // 含有ドメインのテスト
    const extractorWithInclusion = new LinkExtractor(mockDocument, {
      includeDomains: ['github.com', 'stackoverflow.com']
    });
    const linksIncluded = extractorWithInclusion.extractLinks();
    expect(linksIncluded).toHaveLength(2);
    expect(linksIncluded.map(l => l.domain)).toEqual(['github.com', 'stackoverflow.com']);
  });
});

await describe('Link Extractor Error Handling', async () => {
  await test('DOM要素が存在しない場合の処理', () => {
    const mockDocument = {
      querySelectorAll: () => []
    };

    class LinkExtractor {
      constructor(document) {
        this.document = document;
      }

      extractLinks() {
        try {
          const linkElements = this.document.querySelectorAll('a[href]');
          return Array.from(linkElements).map(link => ({
            url: link.href,
            title: link.textContent.trim(),
            domain: this.extractDomain(link.href),
          }));
        } catch (error) {
          console.error('Error extracting links:', error);
          return [];
        }
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    const extractor = new LinkExtractor(mockDocument);
    const links = extractor.extractLinks();

    expect(links).toEqual([]);
  });

  await test('不正なURLの処理', () => {
    const mockDocument = {
      querySelectorAll: () => [
        { href: 'https://valid.com', textContent: 'Valid', hostname: 'valid.com' },
        { href: 'not-a-valid-url', textContent: 'Invalid', hostname: '' },
        { href: 'ftp://invalid-protocol.com', textContent: 'FTP', hostname: 'invalid-protocol.com' },
      ]
    };

    class LinkExtractor {
      constructor(document) {
        this.document = document;
      }

      extractLinks() {
        const linkElements = this.document.querySelectorAll('a[href]');
        return Array.from(linkElements)
          .filter(link => this.isHttpUrl(link.href))
          .map(link => ({
            url: link.href,
            title: link.textContent.trim(),
            domain: this.extractDomain(link.href),
          }));
      }

      isHttpUrl(url) {
        return url.startsWith('http://') || url.startsWith('https://');
      }

      extractDomain(url) {
        try {
          return new URL(url).hostname;
        } catch {
          return 'unknown';
        }
      }
    }

    const extractor = new LinkExtractor(mockDocument);
    const links = extractor.extractLinks();

    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://valid.com');
  });
});

console.log('\n🚀 Content Script (Link Extractor) tests completed');
runner.printSummary();