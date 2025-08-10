-- Database Migration 001: Add Database Version Tracking
-- This migration adds schema versioning support for future migrations

BEGIN;

-- Create schema_migrations table to track applied migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(255) DEFAULT 'system',
    rollback_sql TEXT, -- SQL to rollback this migration if needed
    checksum VARCHAR(64) -- SHA256 hash of migration file for integrity
);

-- Insert initial migration record for existing schema
INSERT INTO schema_migrations (version, name, description, applied_by, checksum) 
VALUES (
    1, 
    'add_versioning', 
    'Add database schema versioning and migration tracking system',
    'system',
    'initial'
) ON CONFLICT (version) DO NOTHING;

-- Create function to get current schema version
CREATE OR REPLACE FUNCTION get_schema_version() 
RETURNS INTEGER 
LANGUAGE SQL 
STABLE
AS $$
    SELECT COALESCE(MAX(version), 0) FROM schema_migrations;
$$;

-- Create function to check if migration is applied
CREATE OR REPLACE FUNCTION is_migration_applied(migration_version INTEGER) 
RETURNS BOOLEAN 
LANGUAGE SQL 
STABLE
AS $$
    SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = migration_version);
$$;

-- Add comment to track migration
COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations and schema versions';

COMMIT;

-- Success notification
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 001 completed: Database versioning system added';
    RAISE NOTICE 'Current schema version: %', (SELECT get_schema_version());
END $$;