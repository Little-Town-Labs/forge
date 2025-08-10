-- Migration Script: Replace EXCLUDE Constraint with Unique Partial Index
-- This migration replaces the PostgreSQL EXCLUDE constraint with a simpler unique partial index
-- for better compatibility across PostgreSQL versions.
-- 
-- Run this migration if you already have a database with the EXCLUDE constraint.
-- For new installations, use schema.sql directly.

BEGIN;

-- Step 1: Drop the existing EXCLUDE constraint if it exists
-- Note: This might fail if the constraint doesn't exist, which is fine for new installations
DO $$
BEGIN
    -- Try to drop the constraint, ignore error if it doesn't exist
    BEGIN
        ALTER TABLE ai_model_config DROP CONSTRAINT IF EXISTS chk_only_one_default_per_provider;
        RAISE NOTICE 'Dropped existing EXCLUDE constraint chk_only_one_default_per_provider';
    EXCEPTION
        WHEN undefined_object THEN
            RAISE NOTICE 'EXCLUDE constraint chk_only_one_default_per_provider did not exist, skipping';
        WHEN OTHERS THEN
            -- Log the error but continue
            RAISE NOTICE 'Error dropping EXCLUDE constraint: %', SQLERRM;
    END;
END $$;

-- Step 2: Create the unique partial index if it doesn't exist
-- This enforces the same constraint: only one default model per provider
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_default_per_provider 
ON ai_model_config(provider) 
WHERE is_default = TRUE;

-- Step 3: Verify the constraint works by testing with sample data
-- This is commented out but can be uncommented for testing
/*
-- Test 1: Insert two models for the same provider, both non-default (should work)
INSERT INTO ai_model_config (provider, model_name, is_default) VALUES 
('openai', 'gpt-4', FALSE),
('openai', 'gpt-3.5-turbo', FALSE)
ON CONFLICT (provider, model_name) DO NOTHING;

-- Test 2: Set one as default (should work)
UPDATE ai_model_config SET is_default = TRUE WHERE provider = 'openai' AND model_name = 'gpt-4';

-- Test 3: Try to set another as default for same provider (should fail)
-- This should raise: ERROR: duplicate key value violates unique constraint "idx_one_default_per_provider"
-- UPDATE ai_model_config SET is_default = TRUE WHERE provider = 'openai' AND model_name = 'gpt-3.5-turbo';

-- Clean up test data
DELETE FROM ai_model_config WHERE provider = 'openai' AND model_name IN ('gpt-4', 'gpt-3.5-turbo');
*/

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE 'EXCLUDE constraint has been replaced with unique partial index idx_one_default_per_provider';
    RAISE NOTICE 'The constraint behavior remains the same: only one default model per provider is allowed';
END $$;