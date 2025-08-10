-- Forge Admin Configuration Seed Data
-- Initial data for the admin configuration system
-- Provides working defaults for immediate use after setup

-- Insert default AI model configurations
-- OpenAI GPT-5-nano (default for OpenAI)
INSERT INTO ai_model_config (
  provider, 
  model_name, 
  is_default, 
  is_enabled,
  temperature, 
  max_tokens, 
  top_p,
  system_prompt
) VALUES (
  'openai', 
  'gpt-5-nano', 
  TRUE, 
  TRUE,
  0.7, 
  1000, 
  1.0,
  'You are a helpful AI assistant with access to a curated knowledge base. Use the provided context to give accurate, helpful responses. If the context doesn''t contain relevant information, clearly state that and provide general guidance if possible.'
) ON CONFLICT (provider, model_name) DO NOTHING;

-- Google Gemini 2.5 Flash (default for Google)
INSERT INTO ai_model_config (
  provider, 
  model_name, 
  is_default, 
  is_enabled,
  temperature, 
  max_tokens, 
  top_p,
  system_prompt
) VALUES (
  'google', 
  'gemini-2.5-flash', 
  TRUE, 
  TRUE,
  0.7, 
  1000, 
  1.0,
  'You are a helpful AI assistant with access to a curated knowledge base. Use the provided context to give accurate, helpful responses. If the context doesn''t contain relevant information, clearly state that and provide general guidance if possible.'
) ON CONFLICT (provider, model_name) DO NOTHING;

-- Alternative OpenAI models (disabled by default)
INSERT INTO ai_model_config (
  provider, 
  model_name, 
  is_default, 
  is_enabled,
  temperature, 
  max_tokens, 
  top_p,
  system_prompt
) VALUES 
  ('openai', 'gpt-4o-mini', FALSE, FALSE, 0.7, 1500, 1.0, 'You are a helpful AI assistant.'),
  ('openai', 'gpt-4o', FALSE, FALSE, 0.7, 2000, 1.0, 'You are a helpful AI assistant.')
ON CONFLICT (provider, model_name) DO NOTHING;

-- Alternative Google models (disabled by default)
INSERT INTO ai_model_config (
  provider, 
  model_name, 
  is_default, 
  is_enabled,
  temperature, 
  max_tokens, 
  top_p,
  system_prompt
) VALUES 
  ('google', 'gemini-1.5-flash', FALSE, FALSE, 0.7, 1500, 1.0, 'You are a helpful AI assistant.'),
  ('google', 'gemini-1.5-pro', FALSE, FALSE, 0.7, 2000, 1.0, 'You are a helpful AI assistant.')
ON CONFLICT (provider, model_name) DO NOTHING;

-- Example RAG URL configurations (commented out by default)
-- Uncomment and modify these examples for initial knowledge base setup
/*
INSERT INTO rag_urls (
  url, 
  namespace, 
  crawl_config, 
  is_active,
  crawl_status
) VALUES 
  (
    'https://docs.example.com', 
    'documentation', 
    '{"mode": "limited", "maxPages": 20}',
    TRUE,
    'pending'
  ),
  (
    'https://blog.example.com', 
    'blog', 
    '{"mode": "deep", "maxDepth": 2}',
    TRUE,
    'pending'
  ),
  (
    'https://help.example.com/getting-started', 
    'help', 
    '{"mode": "single"}',
    TRUE,
    'pending'
  )
ON CONFLICT (url) DO NOTHING;
*/

-- System initialization audit log entry
INSERT INTO config_audit (
  admin_email,
  action,
  resource_type,
  resource_id,
  old_value,
  new_value,
  ip_address,
  user_agent
) VALUES (
  'system@forge.ai',
  'system_initialization',
  'system',
  'initial_setup',
  '{}',
  '{
    "action": "Database schema and seed data initialized",
    "models_created": 6,
    "tables_created": 3,
    "indexes_created": 12,
    "triggers_created": 2
  }',
  '127.0.0.1',
  'Forge Setup Script v1.0'
);

-- View to help with debugging and monitoring
CREATE OR REPLACE VIEW config_summary AS
SELECT 
  'ai_models' as resource_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_enabled = TRUE) as enabled_count,
  COUNT(*) FILTER (WHERE is_default = TRUE) as default_count
FROM ai_model_config
UNION ALL
SELECT 
  'rag_urls' as resource_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_active = TRUE) as enabled_count,
  COUNT(*) FILTER (WHERE crawl_status = 'success') as default_count
FROM rag_urls
UNION ALL
SELECT 
  'audit_logs' as resource_type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as enabled_count,
  COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '7 days') as default_count
FROM config_audit;

-- Grant permissions (adjust based on your Vercel Postgres setup)
-- These are typically handled automatically by Vercel Postgres
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

COMMENT ON VIEW config_summary IS 'Summary view for monitoring configuration system health';