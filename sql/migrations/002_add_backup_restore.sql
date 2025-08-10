-- Database Migration 002: Add Configuration Backup and Restore
-- This migration adds backup/restore capabilities for configuration data

BEGIN;

-- Create configuration backup table
CREATE TABLE IF NOT EXISTS config_backups (
    id SERIAL PRIMARY KEY,
    backup_name VARCHAR(255) NOT NULL UNIQUE,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('manual', 'automatic', 'pre_migration')),
    description TEXT,
    
    -- Store actual configuration data
    ai_models_backup JSONB NOT NULL DEFAULT '[]',
    rag_urls_backup JSONB NOT NULL DEFAULT '[]',
    system_config_backup JSONB NOT NULL DEFAULT '{}',
    
    -- Metadata
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    total_models INTEGER DEFAULT 0,
    total_urls INTEGER DEFAULT 0,
    backup_size_bytes INTEGER DEFAULT 0,
    
    -- Validation and integrity
    backup_hash VARCHAR(64), -- SHA256 hash for integrity verification
    is_verified BOOLEAN DEFAULT FALSE
);

-- Create function to create configuration backup
CREATE OR REPLACE FUNCTION create_config_backup(
    backup_name_param VARCHAR(255),
    backup_type_param VARCHAR(50) DEFAULT 'manual',
    description_param TEXT DEFAULT NULL,
    created_by_param VARCHAR(255) DEFAULT 'system'
) 
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    backup_id INTEGER;
    models_data JSONB;
    urls_data JSONB;
    models_count INTEGER;
    urls_count INTEGER;
BEGIN
    -- Collect AI models data
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'provider', provider,
            'model_name', model_name,
            'is_default', is_default,
            'is_enabled', is_enabled,
            'temperature', temperature,
            'max_tokens', max_tokens,
            'top_p', top_p,
            'system_prompt', system_prompt,
            'created_at', created_at,
            'updated_at', updated_at
            -- Note: api_key_encrypted is excluded from backups for security
        )
    ), '[]'::jsonb) INTO models_data
    FROM ai_model_config;
    
    -- Collect RAG URLs data
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', id,
            'url', url,
            'namespace', namespace,
            'crawl_config', crawl_config,
            'is_active', is_active,
            'last_crawled', last_crawled,
            'crawl_status', crawl_status,
            'pages_indexed', pages_indexed,
            'created_at', created_at,
            'updated_at', updated_at
            -- Note: error_message is excluded to keep backups clean
        )
    ), '[]'::jsonb) INTO urls_data
    FROM rag_urls;
    
    -- Get counts
    GET DIAGNOSTICS models_count = ROW_COUNT;
    SELECT COUNT(*) INTO urls_count FROM rag_urls;
    
    -- Insert backup record
    INSERT INTO config_backups (
        backup_name,
        backup_type,
        description,
        ai_models_backup,
        rag_urls_backup,
        system_config_backup,
        created_by,
        total_models,
        total_urls
    ) VALUES (
        backup_name_param,
        backup_type_param,
        description_param,
        models_data,
        urls_data,
        jsonb_build_object(
            'created_at', CURRENT_TIMESTAMP,
            'schema_version', (SELECT get_schema_version()),
            'total_audit_entries', (SELECT COUNT(*) FROM config_audit)
        ),
        created_by_param,
        (SELECT jsonb_array_length(models_data)),
        (SELECT jsonb_array_length(urls_data))
    ) RETURNING id INTO backup_id;
    
    -- Log backup creation
    INSERT INTO config_audit (
        admin_email,
        action,
        resource_type,
        resource_id,
        new_value
    ) VALUES (
        created_by_param,
        'backup_create',
        'system',
        backup_id::TEXT,
        jsonb_build_object(
            'backup_name', backup_name_param,
            'backup_type', backup_type_param,
            'models_count', (SELECT jsonb_array_length(models_data)),
            'urls_count', (SELECT jsonb_array_length(urls_data))
        )
    );
    
    RETURN backup_id;
END;
$$;

-- Create function to restore configuration from backup
CREATE OR REPLACE FUNCTION restore_config_backup(
    backup_id_param INTEGER,
    restore_mode VARCHAR(50) DEFAULT 'replace', -- 'replace' or 'merge'
    restored_by_param VARCHAR(255) DEFAULT 'system'
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    backup_record RECORD;
    models_restored INTEGER := 0;
    urls_restored INTEGER := 0;
    model_record JSONB;
    url_record JSONB;
    restore_result JSONB;
BEGIN
    -- Get backup record
    SELECT * INTO backup_record 
    FROM config_backups 
    WHERE id = backup_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup with ID % not found', backup_id_param;
    END IF;
    
    -- Start transaction for restore
    IF restore_mode = 'replace' THEN
        -- Clear existing data
        DELETE FROM ai_model_config;
        DELETE FROM rag_urls;
    END IF;
    
    -- Restore AI models
    FOR model_record IN SELECT * FROM jsonb_array_elements(backup_record.ai_models_backup)
    LOOP
        INSERT INTO ai_model_config (
            provider, model_name, is_default, is_enabled,
            temperature, max_tokens, top_p, system_prompt
        ) VALUES (
            (model_record->>'provider')::VARCHAR,
            (model_record->>'model_name')::VARCHAR,
            (model_record->>'is_default')::BOOLEAN,
            (model_record->>'is_enabled')::BOOLEAN,
            (model_record->>'temperature')::DECIMAL,
            (model_record->>'max_tokens')::INTEGER,
            (model_record->>'top_p')::DECIMAL,
            model_record->>'system_prompt'
        ) ON CONFLICT (provider, model_name) DO UPDATE SET
            is_default = EXCLUDED.is_default,
            is_enabled = EXCLUDED.is_enabled,
            temperature = EXCLUDED.temperature,
            max_tokens = EXCLUDED.max_tokens,
            top_p = EXCLUDED.top_p,
            system_prompt = EXCLUDED.system_prompt,
            updated_at = CURRENT_TIMESTAMP;
        
        models_restored := models_restored + 1;
    END LOOP;
    
    -- Restore RAG URLs
    FOR url_record IN SELECT * FROM jsonb_array_elements(backup_record.rag_urls_backup)
    LOOP
        INSERT INTO rag_urls (
            url, namespace, crawl_config, is_active,
            last_crawled, crawl_status, pages_indexed
        ) VALUES (
            url_record->>'url',
            url_record->>'namespace',
            (url_record->>'crawl_config')::JSONB,
            (url_record->>'is_active')::BOOLEAN,
            CASE 
                WHEN url_record->>'last_crawled' IS NOT NULL 
                THEN (url_record->>'last_crawled')::TIMESTAMPTZ 
                ELSE NULL 
            END,
            url_record->>'crawl_status',
            (url_record->>'pages_indexed')::INTEGER
        ) ON CONFLICT (url) DO UPDATE SET
            namespace = EXCLUDED.namespace,
            crawl_config = EXCLUDED.crawl_config,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP;
        
        urls_restored := urls_restored + 1;
    END LOOP;
    
    -- Create restore result
    restore_result := jsonb_build_object(
        'backup_id', backup_id_param,
        'backup_name', backup_record.backup_name,
        'restore_mode', restore_mode,
        'models_restored', models_restored,
        'urls_restored', urls_restored,
        'restored_at', CURRENT_TIMESTAMP
    );
    
    -- Log restore operation
    INSERT INTO config_audit (
        admin_email,
        action,
        resource_type,
        resource_id,
        new_value
    ) VALUES (
        restored_by_param,
        'backup_restore',
        'system',
        backup_id_param::TEXT,
        restore_result
    );
    
    RETURN restore_result;
END;
$$;

-- Record migration
INSERT INTO schema_migrations (version, name, description, applied_by, checksum) 
VALUES (
    2, 
    'add_backup_restore', 
    'Add configuration backup and restore capabilities',
    'system',
    'backup_restore_v1'
) ON CONFLICT (version) DO NOTHING;

-- Add comments
COMMENT ON TABLE config_backups IS 'Configuration backups for disaster recovery and rollback';
COMMENT ON FUNCTION create_config_backup IS 'Creates a complete backup of system configuration';
COMMENT ON FUNCTION restore_config_backup IS 'Restores system configuration from a backup';

COMMIT;

-- Success notification
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 002 completed: Backup and restore system added';
    RAISE NOTICE 'New functions: create_config_backup(), restore_config_backup()';
    RAISE NOTICE 'Use: SELECT create_config_backup(''my_backup'', ''manual'', ''Pre-update backup'', ''admin@company.com'');';
END $$;