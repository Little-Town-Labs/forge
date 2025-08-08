export interface Page {
  url: string;
  content: string;
}

export interface SeedOptions {
  splittingMethod: 'recursive' | 'markdown';
  chunkSize: number;
  chunkOverlap: number;
}

export interface Metadata {
  chunk: string;
  url: string;
  title?: string;
}

export interface ScoredVector {
  id: string;
  score: number;
  metadata: Metadata;
}

export interface CrawlConfig {
  mode: 'single' | 'limited' | 'deep';
  maxPages?: number;
  maxDepth?: number;
}

export interface CrawlStats {
  pagesFound: number;
  pagesProcessed: number;
  totalTokens: number;
  crawlDuration: number;
  failedPages: string[];
  errors: string[];
}

export interface CrawlRequest {
  url: string;
  embeddingProvider?: string;
  options?: SeedOptions;
  crawlConfig?: CrawlConfig;
} 