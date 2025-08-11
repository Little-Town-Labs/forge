-- Forge Admin Configuration Database Schema
-- PostgreSQL schema for admin configuration management
-- Designed for Vercel Postgres deployment

-- AI Model Configuration Table
CREATE TABLE IF NOT EXISTS ai_model_config (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('openai', 'google')),
  model_name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 1000 CHECK (max_tokens >= 1 AND max_tokens <= 8192),
  top_p DECIMAL(3,2) DEFAULT 1.0 CHECK (top_p >= 0 AND top_p <= 1),
  system_prompt TEXT,
  api_key_encrypted TEXT, -- Encrypted API key using AES-256-GCM
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- RAG URLs Configuration Table
CREATE TABLE IF NOT EXISTS rag_urls (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  namespace VARCHAR(100) DEFAULT 'default',
  crawl_config JSONB NOT NULL DEFAULT '{}', -- Flexible crawl configuration
  is_active BOOLEAN DEFAULT TRUE,
  last_crawled TIMESTAMPTZ,
  crawl_status VARCHAR(20) DEFAULT 'pending' CHECK (crawl_status IN ('pending', 'success', 'failed', 'in_progress', 'partial_success')),
  pages_indexed INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Configuration Audit Log Table
CREATE TABLE IF NOT EXISTS config_audit (
  id SERIAL PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL, -- e.g., 'model_create', 'model_update', 'url_add', 'url_delete'
  resource_type VARCHAR(30) NOT NULL CHECK (resource_type IN ('ai_model', 'rag_url', 'system')),
  resource_id VARCHAR(50), -- ID of the affected resource
  old_value JSONB, -- Previous configuration state
  new_value JSONB, -- New configuration state
  ip_address INET, -- Client IP for security auditing
  user_agent TEXT, -- Browser/client information
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_model_provider_name ON ai_model_config(provider, model_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_per_provider ON ai_model_config(provider) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_model_enabled ON ai_model_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_ai_model_provider ON ai_model_config(provider);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rag_urls_url ON rag_urls(url);
CREATE INDEX IF NOT EXISTS idx_rag_urls_namespace ON rag_urls(namespace);
CREATE INDEX IF NOT EXISTS idx_rag_urls_active ON rag_urls(is_active);
CREATE INDEX IF NOT EXISTS idx_rag_urls_status ON rag_urls(crawl_status);
CREATE INDEX IF NOT EXISTS idx_rag_urls_last_crawled ON rag_urls(last_crawled);

CREATE INDEX IF NOT EXISTS idx_config_audit_admin ON config_audit(admin_email);
CREATE INDEX IF NOT EXISTS idx_config_audit_resource ON config_audit(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_config_audit_action ON config_audit(action);
CREATE INDEX IF NOT EXISTS idx_config_audit_created ON config_audit(created_at DESC);

-- Data integrity constraints
-- Note: Unique constraint for one default per provider is enforced by idx_one_default_per_provider index above

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_ai_model_config_updated_at 
  BEFORE UPDATE ON ai_model_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_rag_urls_updated_at 
  BEFORE UPDATE ON rag_urls 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ai_model_config IS 'Configuration for AI model providers (OpenAI, Google)';
COMMENT ON COLUMN ai_model_config.api_key_encrypted IS 'API key encrypted using AES-256-GCM with CONFIG_ENCRYPTION_KEY';
COMMENT ON COLUMN ai_model_config.is_default IS 'Only one model per provider can be default (enforced by idx_one_default_per_provider unique partial index)';

COMMENT ON TABLE rag_urls IS 'URLs configured for RAG knowledge base crawling';
COMMENT ON COLUMN rag_urls.crawl_config IS 'JSONB field containing CrawlConfig object with mode, maxPages, maxDepth';
COMMENT ON COLUMN rag_urls.namespace IS 'Namespace for organizing crawled content';

COMMENT ON TABLE config_audit IS 'Audit trail for all configuration changes made by administrators';
COMMENT ON COLUMN config_audit.old_value IS 'Previous configuration state (sensitive data masked)';
COMMENT ON COLUMN config_audit.new_value IS 'New configuration state (sensitive data masked)';