import * as cheerio from 'cheerio';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { Page, CrawlStats } from '@/types';
import { getRagUrls, updateRagUrl } from '@/lib/config-service';

export interface CrawlResult {
  pages: Page[];
  stats: CrawlStats;
  namespace?: string;
  urlConfigId?: number;
}

export interface DatabaseCrawlOptions {
  urlConfigId: number;
  adminEmail: string;
  updateStatus?: boolean;
}

export class Crawler {
  private seen = new Set<string>();
  private pages: Page[] = [];
  private queue: { url: string; depth: number }[] = [];
  private abortController?: AbortController;
  private startTime: number = 0;
  private failedPages: string[] = [];
  private errors: string[] = [];
  private namespace?: string;
  private urlConfigId?: number;
  private adminEmail?: string;
  private updateStatus: boolean = false;
  private statusUpdateInterval?: NodeJS.Timeout;
  private lastProgressUpdate: number = 0;
  private progressUpdateFrequency: number = 10000; // Update every 10 seconds

  constructor(
    private maxDepth = 2, 
    private maxPages = 1, 
    private timeoutMs = 120000, // Default 2 minutes
    dbOptions?: DatabaseCrawlOptions
  ) {
    console.log(`Crawler initialized: maxDepth=${maxDepth}, maxPages=${maxPages}, timeout=${Math.round(timeoutMs/1000)}s`);
    
    if (dbOptions) {
      this.urlConfigId = dbOptions.urlConfigId;
      this.adminEmail = dbOptions.adminEmail;
      this.updateStatus = dbOptions.updateStatus ?? true;
    }
  }

  /**
   * Create a crawler from database configuration
   */
  static async fromDatabaseConfig(urlConfigId: number, adminEmail: string): Promise<Crawler> {
    try {
      const ragUrls = await getRagUrls();
      const urlConfig = ragUrls.find(config => config.id === urlConfigId);
      
      if (!urlConfig) {
        throw new Error(`URL configuration with ID ${urlConfigId} not found`);
      }

      if (!urlConfig.isActive) {
        throw new Error(`URL configuration ${urlConfigId} is not active`);
      }

      const crawlConfig = urlConfig.crawlConfig;
      const maxDepth = crawlConfig.maxDepth || 2;
      const maxPages = crawlConfig.maxPages || 10;
      
      // Set timeout based on crawl mode
      let timeoutMs = 300000; // 5 minutes default
      if (crawlConfig.mode === 'single') {
        timeoutMs = 60000; // 1 minute for single page
      } else if (crawlConfig.mode === 'limited') {
        timeoutMs = 180000; // 3 minutes for limited crawl
      } else if (crawlConfig.mode === 'deep') {
        timeoutMs = 600000; // 10 minutes for deep crawl
      }

      const crawler = new Crawler(maxDepth, maxPages, timeoutMs, {
        urlConfigId,
        adminEmail,
        updateStatus: true
      });
      
      crawler.namespace = urlConfig.namespace;
      
      console.log(`Database crawler created for URL: ${urlConfig.url}`, {
        namespace: urlConfig.namespace,
        mode: crawlConfig.mode,
        maxDepth,
        maxPages,
        timeoutMinutes: Math.round(timeoutMs / 60000)
      });
      
      return crawler;
    } catch (error) {
      console.error(`Failed to create database crawler: ${error}`);
      throw error;
    }
  }

  async crawl(startUrl: string): Promise<CrawlResult> {
    this.startTime = Date.now();
    this.abortController = new AbortController();
    
    console.log(`[CRAWLER START] 🚀 Starting crawl of ${startUrl}`, {
      maxDepth: this.maxDepth,
      maxPages: this.maxPages,
      timeoutMinutes: Math.round(this.timeoutMs / 60000),
      databaseIntegration: this.updateStatus
    });
    
    // Update status to in_progress if using database integration
    await this.updateCrawlStatus('in_progress');
    
    // Set up periodic status updates for long-running crawls
    this.setupPeriodicStatusUpdates();
    
    // Set up timeout with cleanup
    const timeoutId = setTimeout(() => {
      console.log(`[CRAWLER TIMEOUT] ⏰ Crawl timeout reached after ${Math.round(this.timeoutMs / 1000)}s`);
      this.abortController?.abort();
    }, this.timeoutMs);

    try {
      // Add the start URL to the queue
      this.addToQueue(startUrl);

      // While there are URLs in the queue and we haven't reached the maximum number of pages...
      while (this.shouldContinueCrawling()) {
        // Check if operation was aborted
        if (this.abortController?.signal.aborted) {
          const reason = this.abortController.signal.reason || 'Crawl operation timed out';
          console.warn(`[CRAWLER ABORT] 🛑 Crawl operation was aborted: ${reason}`);
          await this.updateCrawlStatus('failed', `Crawl aborted: ${reason}`);
          throw new Error(`Crawl operation was aborted: ${reason}`);
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

            // Update progress periodically with enhanced logging
            if (this.pages.length % 3 === 0 || this.pages.length === 1) {
              await this.updateCrawlProgress();
              
              // Log progress for user feedback
              const progress = this.getProgress();
              console.log(`[CRAWLER PROGRESS] 📈 Progress: ${progress.processed}/${progress.total} pages, Current: ${progress.currentUrl}`);
            }

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
      this.cleanup(); // Clean up resources
      
      const result = this.buildCrawlResult();
      
      // Determine final status based on results
      const hasFailures = result.stats.errors.length > 0 || result.stats.failedPages.length > 0;
      const finalStatus = hasFailures && result.stats.pagesProcessed > 0 ? 'partial_success' : 'success';
      
      // Update final success status with enhanced logging
      await this.updateCrawlStatus(finalStatus, undefined, result.stats.pagesProcessed);
      
      console.log(`[CRAWLER COMPLETE] ✅ Crawl completed successfully`, {
        status: finalStatus,
        pagesProcessed: result.stats.pagesProcessed,
        duration: result.stats.crawlDuration,
        errors: result.stats.errors.length,
        failedPages: result.stats.failedPages.length
      });
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      this.cleanup(); // Clean up resources on error
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[CRAWLER ERROR] ❌ Crawl operation failed:`, {
        error: errorMessage,
        pagesProcessed: this.pages.length,
        duration: Date.now() - this.startTime
      });
      
      // Update final failure status with enhanced error handling
      await this.updateCrawlStatus('failed', errorMessage, this.pages.length);
      
      // Add the overall failure to errors if it's not a timeout or abort
      if (error instanceof Error && 
          !error.message.includes('timeout') && 
          !error.message.includes('abort')) {
        this.errors.push(`Crawl operation failed: ${error.message}`);
      }
      
      // Return partial results even on failure
      const result = this.buildCrawlResult();
      console.log(`[CRAWLER PARTIAL] 📊 Returning partial crawl results: ${result.stats.pagesProcessed} pages processed`);
      
      return result;
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
      stats,
      namespace: this.namespace,
      urlConfigId: this.urlConfigId
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
   * Update crawl status in database with comprehensive error handling and fallback
   */
  private async updateCrawlStatus(
    status: 'pending' | 'in_progress' | 'success' | 'failed' | 'partial_success',
    errorMessage?: string,
    pagesIndexed?: number,
    retryCount: number = 0
  ): Promise<void> {
    // Gracefully skip if database integration is not enabled
    if (!this.updateStatus || !this.urlConfigId || !this.adminEmail) {
      console.log(`[CRAWLER STATUS] Skipping database update - integration disabled`);
      return;
    }

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = {
        crawlStatus: status,
        lastCrawled: new Date()
      };

      if (errorMessage !== undefined) {
        updates.errorMessage = errorMessage;
      }
      
      if (pagesIndexed !== undefined) {
        updates.pagesIndexed = pagesIndexed;
      }

      // Execute with timeout for database operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database status update timeout')), 15000);
      });
      
      await Promise.race([
        updateRagUrl(this.urlConfigId!, updates, this.adminEmail!),
        timeoutPromise
      ]);
      
      console.log(`[CRAWLER STATUS] ✅ Updated crawl status to '${status}' for URL config ${this.urlConfigId}`, {
        pagesIndexed,
        errorMessage: errorMessage ? errorMessage.substring(0, 100) + (errorMessage.length > 100 ? '...' : '') : undefined,
        attempt: retryCount + 1
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      console.error(`[CRAWLER STATUS] ❌ Failed to update crawl status in database (attempt ${retryCount + 1}/${maxRetries + 1}):`, {
        error: errorMsg,
        status,
        urlConfigId: this.urlConfigId,
        pagesIndexed
      });
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`[CRAWLER STATUS] 🔄 Retrying database update in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.updateCrawlStatus(status, errorMessage, pagesIndexed, retryCount + 1);
      }
      
      // After all retries failed, log final failure but don't throw
      console.error(`[CRAWLER STATUS] ❌ All retry attempts failed for database status update. Continuing crawl without database tracking.`);
      
      // Optionally switch to demo mode if database is consistently failing
      if (this.shouldSwitchToDemoMode(error)) {
        console.warn(`[CRAWLER STATUS] ⚠️  Switching to demo mode due to persistent database errors`);
        this.updateStatus = false; // Disable further database updates for this crawl
      }
    }
  }

  /**
   * Update crawl progress in database with real-time status updates and fallback
   */
  private async updateCrawlProgress(): Promise<void> {
    if (!this.updateStatus || !this.urlConfigId || !this.adminEmail) {
      return;
    }

    // Implement throttling for real-time updates
    const now = Date.now();
    if (now - this.lastProgressUpdate < this.progressUpdateFrequency) {
      return; // Skip update if too frequent
    }
    
    this.lastProgressUpdate = now;

    try {
      // Execute progress update with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Progress update timeout')), 10000);
      });
      
      await Promise.race([
        updateRagUrl(
          this.urlConfigId,
          {
            pagesIndexed: this.pages.length,
            lastCrawled: new Date()
          },
          this.adminEmail
        ),
        timeoutPromise
      ]);

      console.log(`[CRAWLER PROGRESS] 📊 Updated crawl progress: ${this.pages.length} pages indexed for URL config ${this.urlConfigId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[CRAWLER PROGRESS] ❌ Failed to update crawl progress in database:`, {
        error: errorMsg,
        pagesIndexed: this.pages.length,
        urlConfigId: this.urlConfigId
      });
      
      // If database updates consistently fail, consider switching to demo mode
      if (this.shouldSwitchToDemoMode(error)) {
        console.warn(`[CRAWLER PROGRESS] ⚠️  Disabling database progress updates due to persistent errors`);
        this.updateStatus = false;
      }
      
      // Don't throw - progress update failures shouldn't break the crawl
    }
  }

  /**
   * Get current namespace for this crawler
   */
  public getNamespace(): string | undefined {
    return this.namespace;
  }

  /**
   * Get URL configuration ID for this crawler
   */
  public getUrlConfigId(): number | undefined {
    return this.urlConfigId;
  }

  /**
   * Determine if we should switch to demo mode based on error patterns
   */
  private shouldSwitchToDemoMode(error: unknown): boolean {
    const errorMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();
    
    // Switch to demo mode for persistent database issues
    return errorMsg.includes('database') || 
           errorMsg.includes('connection') || 
           errorMsg.includes('timeout') || 
           errorMsg.includes('postgres') ||
           errorMsg.includes('sql');
  }

  /**
   * Set up periodic status updates for long-running crawls
   */
  private setupPeriodicStatusUpdates(): void {
    if (!this.updateStatus || this.statusUpdateInterval) {
      return; // Already set up or disabled
    }
    
    // Update status every 30 seconds for long-running crawls
    this.statusUpdateInterval = setInterval(async () => {
      try {
        await this.updateCrawlProgress();
      } catch (error) {
        console.error(`[CRAWLER PERIODIC] Error in periodic status update:`, error);
      }
    }, 30000);
    
    console.log(`[CRAWLER SETUP] ⏰ Periodic status updates enabled (every 30s)`);
  }

  /**
   * Clean up periodic status updates and other resources
   */
  private cleanup(): void {
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = undefined;
      console.log(`[CRAWLER CLEANUP] ⏰ Periodic status updates disabled`);
    }
    
    // Clean up abort controller
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort();
    }
    
    console.log(`[CRAWLER CLEANUP] 🧹 Crawler resources cleaned up`);
  }

  /**
   * Handle graceful shutdown and cancellation
   */
  public async cancel(reason: string = 'User requested cancellation'): Promise<void> {
    console.log(`[CRAWLER CANCEL] 🛑 Cancelling crawl: ${reason}`);
    
    // Signal abort to all ongoing operations
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort();
    }
    
    // Update status to indicate cancellation
    await this.updateCrawlStatus('failed', `Crawl cancelled: ${reason}`, this.pages.length);
    
    // Clean up resources
    this.cleanup();
    
    console.log(`[CRAWLER CANCEL] ✅ Crawl cancellation completed`);
  }

  /**
   * Check robots.txt restrictions (placeholder for Phase 3)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkRobotsTxt(_url: string): boolean {
    // Phase 3: Implement actual robots.txt checking
    // For now, allow all URLs
    return true;
  }
} 