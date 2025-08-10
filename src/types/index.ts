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
  namespace?: string;
  urlConfigId?: number;
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

// Admin Configuration Types for Vercel Postgres

export type ModelProvider = 'openai' | 'google';
export type CrawlStatus = 'pending' | 'success' | 'failed' | 'in_progress' | 'partial_success';
export type ConfigAction = 
  | 'model_create' | 'model_update' | 'model_delete' | 'model_test'
  | 'url_create' | 'url_update' | 'url_delete' | 'url_crawl'
  | 'system_initialization' | 'system_update';

export interface AiModelConfig {
  id: number;
  provider: ModelProvider;
  modelName: string;
  isDefault: boolean;
  isEnabled: boolean;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt?: string;
  apiKey?: string; // Decrypted when retrieved from service
  createdAt: Date;
  updatedAt: Date;
}

export interface RagUrlConfig {
  id: number;
  url: string;
  namespace: string;
  crawlConfig: CrawlConfig;
  isActive: boolean;
  lastCrawled?: Date;
  crawlStatus: CrawlStatus;
  pagesIndexed: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConfigAuditEntry {
  id: number;
  adminEmail: string;
  action: ConfigAction | string;
  resourceType: 'ai_model' | 'rag_url' | 'system';
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Database row types for Vercel Postgres query results
export interface AiModelConfigRow {
  id: number;
  provider: string;
  model_name: string;
  is_default: boolean;
  is_enabled: boolean;
  temperature: string | number; // Postgres returns decimals as strings or numbers
  max_tokens: number;
  top_p: string | number; // Postgres returns decimals as strings or numbers
  system_prompt?: string;
  api_key_encrypted?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RagUrlConfigRow {
  id: number;
  url: string;
  namespace: string;
  crawl_config: string | object; // JSONB field
  is_active: boolean;
  last_crawled?: Date;
  crawl_status: string;
  pages_indexed: number;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConfigAuditRow {
  id: number;
  admin_email: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  old_value?: string | object; // JSONB field
  new_value?: string | object; // JSONB field
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
} 