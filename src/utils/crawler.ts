import * as cheerio from 'cheerio';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Page, CrawlStats } from '@/types';

export interface CrawlResult {
  pages: Page[];
  stats: CrawlStats;
}

export class Crawler {
  private seen = new Set<string>();
  private pages: Page[] = [];
  private queue: { url: string; depth: number }[] = [];
  private abortController?: AbortController;
  private startTime: number = 0;
  private failedPages: string[] = [];
  private errors: string[] = [];

  constructor(
    private maxDepth = 2, 
    private maxPages = 1, 
    private timeoutMs = 120000 // Default 2 minutes
  ) {
    console.log(`Crawler initialized: maxDepth=${maxDepth}, maxPages=${maxPages}, timeout=${Math.round(timeoutMs/1000)}s`);
  }

  async crawl(startUrl: string): Promise<CrawlResult> {
    this.startTime = Date.now();
    this.abortController = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, this.timeoutMs);

    try {
      // Add the start URL to the queue
      this.addToQueue(startUrl);

      // While there are URLs in the queue and we haven't reached the maximum number of pages...
      while (this.shouldContinueCrawling()) {
        // Check if operation was aborted
        if (this.abortController?.signal.aborted) {
          console.warn('Crawl operation was aborted due to timeout');
          throw new Error('Crawl operation was aborted due to timeout');
        }

        // Dequeue the next URL and depth
        const { url, depth } = this.queue.shift()!;

        // If the depth is too great or we've already seen this URL, skip it
        if (this.isTooDeep(depth) || this.isAlreadySeen(url)) continue;

        // Check robots.txt (placeholder for Phase 3)
        if (!this.checkRobotsTxt(url)) {
          console.log(`Skipping ${url} due to robots.txt restrictions`);
          continue;
        }

        // Add the URL to the set of seen URLs
        this.seen.add(url);

        try {
          // Fetch the page HTML with retry logic
          const html = await this.fetchPageWithRetry(url);

          if (html) {
            // Parse the HTML and add the page to the list of crawled pages
            this.pages.push({ url, content: this.parseHtml(html) });

            // Only extract URLs if we're not at max depth and want to continue crawling
            if (depth < this.maxDepth - 1) {
              this.addNewUrlsToQueue(this.extractUrls(html, url), depth);
            }
          } else {
            // HTML was empty or failed to fetch
            this.failedPages.push(url);
            this.errors.push(`Failed to fetch content from ${url}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`Failed to crawl ${url}:`, error);
          this.failedPages.push(url);
          this.errors.push(`Error crawling ${url}: ${errorMessage}`);
          // Continue with other pages instead of failing entirely
        }
      }

      clearTimeout(timeoutId);
      return this.buildCrawlResult();
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Crawl operation failed:', error);
      
      // Add the overall failure to errors if it's not a timeout
      if (error instanceof Error && !error.message.includes('timeout')) {
        this.errors.push(`Crawl operation failed: ${error.message}`);
      }
      
      return this.buildCrawlResult(); // Return whatever we managed to crawl
    }
  }

  /**
   * Build the final crawl result with pages and comprehensive stats
   */
  private buildCrawlResult(): CrawlResult {
    const crawlDuration = Date.now() - this.startTime;
    
    const stats: CrawlStats = {
      pagesFound: this.seen.size,
      pagesProcessed: this.pages.length,
      totalTokens: this.pages.reduce((sum, page) => sum + page.content.length, 0),
      crawlDuration,
      failedPages: [...this.failedPages],
      errors: [...this.errors]
    };

    return {
      pages: [...this.pages],
      stats
    };
  }

  private addToQueue(url: string, depth = 0) {
    this.queue.push({ url, depth });
  }

  private shouldContinueCrawling(): boolean {
    return this.queue.length > 0 && this.pages.length < this.maxPages;
  }

  private isTooDeep(depth: number): boolean {
    return depth >= this.maxDepth;
  }

  private isAlreadySeen(url: string): boolean {
    return this.seen.has(url);
  }

  private async fetchPage(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        signal: this.abortController?.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ForgeBot/1.0; +https://yoursite.com/bot)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error(`Failed to fetch ${url}: ${error}`);
      return "";
    }
  }

  private async fetchPageWithRetry(url: string, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const html = await this.fetchPage(url);
        if (html) return html;
        
        // Empty HTML could be a transient issue, worth retrying
        if (attempt < maxRetries) {
          console.warn(`Empty HTML response from ${url}, attempt ${attempt + 1}, retrying...`);
        }
      } catch (error) {
        lastError = error as Error;
        const shouldRetry = this.shouldRetryError(error, attempt, maxRetries);
        
        console.warn(`Attempt ${attempt + 1} failed for ${url}: ${error}`);
        
        if (shouldRetry) {
          // Wait before retry with exponential backoff (1s, 2s, 4s)
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.warn(`Retrying ${url} in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        } else {
          // Don't retry for non-transient errors
          console.warn(`Non-retryable error for ${url}, skipping retries`);
          break;
        }
      }
    }
    
    if (lastError) {
      console.error(`All attempts failed for ${url}:`, lastError);
      // Throw the error so it can be tracked properly
      throw lastError;
    }
    
    return "";
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetryError(error: unknown, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) return false;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerError = errorMessage.toLowerCase();
    
    // Retry transient errors
    if (lowerError.includes('timeout') || 
        lowerError.includes('econnreset') ||
        lowerError.includes('econnrefused') ||
        lowerError.includes('etimedout') ||
        lowerError.includes('socket hang up') ||
        lowerError.includes('network error')) {
      return true;
    }
    
    // Retry 5xx server errors
    if (lowerError.includes('http 5') || 
        lowerError.includes('502') || 
        lowerError.includes('503') || 
        lowerError.includes('504') ||
        lowerError.includes('internal server error') ||
        lowerError.includes('bad gateway') ||
        lowerError.includes('service unavailable') ||
        lowerError.includes('gateway timeout')) {
      return true;
    }
    
    // Retry 429 (too many requests)
    if (lowerError.includes('429') || lowerError.includes('too many requests')) {
      return true;
    }
    
    // Don't retry 4xx client errors (except 429), they're likely permanent
    if (lowerError.includes('http 4') && !lowerError.includes('429')) {
      return false;
    }
    
    return false;
  }

  private parseHtml(html: string): string {
    const $ = cheerio.load(html);
    $("a").removeAttr("href");
    return NodeHtmlMarkdown.translate($.html());
  }

  private extractUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const relativeUrls = $("a")
      .map((_, link) => $(link).attr("href"))
      .get() as string[];
    
    // Filter and validate URLs
    return relativeUrls
      .filter(url => url && !url.startsWith('#') && !url.startsWith('mailto:') && !url.startsWith('tel:'))
      .map(relativeUrl => {
        try {
          const fullUrl = new URL(relativeUrl, baseUrl);
          
          // Stay within the same domain by default
          const baseDomain = new URL(baseUrl).hostname;
          if (fullUrl.hostname !== baseDomain) {
            return null;
          }
          
          return fullUrl.href;
        } catch (error) {
          console.warn(`Invalid URL found: ${relativeUrl}`, error);
          return null;
        }
      })
      .filter((url): url is string => url !== null);
  }

  private addNewUrlsToQueue(urls: string[], depth: number) {
    for (const url of urls) {
      if (!this.seen.has(url)) {
        this.addToQueue(url, depth + 1);
      }
    }
  }

  /**
   * Get current crawling progress
   */
  public getProgress(): { processed: number; total: number; currentUrl?: string } {
    return {
      processed: this.pages.length,
      total: Math.min(this.seen.size + this.queue.length, this.maxPages),
      currentUrl: this.queue[0]?.url
    };
  }

  /**
   * Check robots.txt restrictions (placeholder for Phase 3)
   */
  private checkRobotsTxt(_url: string): boolean {
    // Phase 3: Implement actual robots.txt checking
    // For now, allow all URLs
    return true;
  }
} 