-- Test Script: Verify Unique Partial Index Constraint
-- This script tests that the unique partial index correctly prevents
-- multiple default models per provider.

BEGIN;

-- Clean up any existing test data
DELETE FROM ai_model_config WHERE model_name LIKE 'test-%';

-- Test 1: Insert multiple non-default models for same provider (should succeed)
INSERT INTO ai_model_config (provider, model_name, is_default, temperature, max_tokens, top_p) VALUES 
('openai', 'test-gpt-4', FALSE, 0.7, 4000, 1.0),
('openai', 'test-gpt-3.5-turbo', FALSE, 0.7, 4000, 1.0);

SELECT 'Test 1 PASSED: Multiple non-default models for same provider allowed' as result;

-- Test 2: Set one model as default (should succeed)
UPDATE ai_model_config SET is_default = TRUE WHERE model_name = 'test-gpt-4';

SELECT 'Test 2 PASSED: Setting first model as default allowed' as result;

-- Test 3: Try to set another model as default for same provider (should fail)
-- This should raise an error due to the unique partial index
DO $$
BEGIN
    -- This should fail
    BEGIN
        UPDATE ai_model_config SET is_default = TRUE WHERE model_name = 'test-gpt-3.5-turbo';
        RAISE EXCEPTION 'Test 3 FAILED: Should not allow multiple defaults per provider';
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Test 3 PASSED: Unique constraint correctly prevented multiple defaults';
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Test 3 ERROR: Unexpected error: %', SQLERRM;
    END;
END $$;

-- Test 4: Set default for different provider (should succeed)
INSERT INTO ai_model_config (provider, model_name, is_default, temperature, max_tokens, top_p) VALUES 
('google', 'test-gemini-pro', TRUE, 0.7, 8000, 0.95);

SELECT 'Test 4 PASSED: Default models for different providers allowed' as result;

-- Test 5: Verify current state
SELECT 
    provider, 
    model_name, 
    is_default,
    'Test 5 VERIFICATION: Current default models' as result
FROM ai_model_config 
WHERE model_name LIKE 'test-%' AND is_default = TRUE
ORDER BY provider;

-- Clean up test data
DELETE FROM ai_model_config WHERE model_name LIKE 'test-%';

SELECT 'All tests completed successfully! The unique partial index constraint is working correctly.' as result;

ROLLBACK;